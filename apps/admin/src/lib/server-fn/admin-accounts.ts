/**
 * admin-accounts.ts — Server functions for AdminUser management
 *
 * SUPERADMIN only. Mirrors the web app's employee server functions
 * but operates on AdminUser instead of the tenant User table.
 */

import { buildSummaryFromDatabase } from '@platform/lib/authorization/authorization-engine.server'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { getServerContext } from '@platform/lib/better-auth/server-context'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import type { AdminRole } from 'prisma/generated/prisma/enums'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  emailVerified: boolean
  deletedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

// ---------------------------------------------------------------------------
// Guard — caller must have QA_ASSIGN_TEST (i.e. SUPERADMIN)
// ---------------------------------------------------------------------------

async function requireSuperAdmin(context: unknown) {
  const user = getServerContext(context).user
  if (!user?.id) throw new Error('UNAUTHENTICATED')
  const summary = await buildSummaryFromDatabase({
    userId: user.id,
    role: (user as { role?: string }).role ?? '',
  })
  if (!summary.permissions.includes(Permissions.QA_ASSIGN_TEST)) {
    throw new Error('Only SUPERADMIN can manage admin accounts.')
  }
  return user
}

// ---------------------------------------------------------------------------
// listAdminUsers
// ---------------------------------------------------------------------------

export const listAdminUsers = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<AdminUserRow[]> => {
    const users = await rootPrisma.adminUser.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        emailVerified: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return users.map(u => ({ ...u, role: u.role as string }))
  })

// ---------------------------------------------------------------------------
// createAdminUser
// ---------------------------------------------------------------------------

export const createAdminUser = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { name: string; email: string; role: string; password: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: true; id: string } | { success: false; error: string }> => {
    await requireSuperAdmin(context)

    const existing = await rootPrisma.adminUser.findUnique({
      where: { email: data.email },
      select: { id: true, deletedAt: true },
    })

    if (existing) {
      if (existing.deletedAt) {
        // Reactivate soft-deleted account
        await rootPrisma.adminUser.update({
          where: { id: existing.id },
          data: { deletedAt: null, name: data.name, role: data.role as AdminRole },
        })
        return { success: true, id: existing.id }
      }
      return { success: false, error: 'An admin account with this email already exists.' }
    }

    // Use better-auth's hashPassword to match the credential provider format
    const { hashPassword } = await import('better-auth/crypto')
    const hashedPassword = await hashPassword(data.password)

    const user = await rootPrisma.adminUser.create({
      data: {
        name: data.name,
        email: data.email,
        role: data.role as AdminRole,
        accounts: {
          create: {
            accountId: data.email,
            providerId: 'credential',
            password: hashedPassword,
          },
        },
      },
      select: { id: true },
    })

    return { success: true, id: user.id }
  })

// ---------------------------------------------------------------------------
// updateAdminUser
// ---------------------------------------------------------------------------

export const updateAdminUser = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string; name?: string; role?: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: true } | { success: false; error: string }> => {
    await requireSuperAdmin(context)

    await rootPrisma.adminUser.update({
      where: { id: data.id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.role ? { role: data.role as AdminRole } : {}),
      },
    })

    return { success: true }
  })

// ---------------------------------------------------------------------------
// deleteAdminUser — soft delete
// ---------------------------------------------------------------------------

export const deleteAdminUser = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: true } | { success: false; error: string }> => {
    const caller = await requireSuperAdmin(context)

    if (caller.id === data.id) {
      return { success: false, error: 'You cannot delete your own account.' }
    }

    await rootPrisma.adminUser.update({
      where: { id: data.id },
      data: { deletedAt: new Date() },
    })

    return { success: true }
  })

// ---------------------------------------------------------------------------
// revokeAdminSessions — log out all sessions for an admin user
// ---------------------------------------------------------------------------

export const revokeAdminSessions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: true; count: number }> => {
    await requireSuperAdmin(context)

    const result = await rootPrisma.adminSession.deleteMany({
      where: { userId: data.userId },
    })

    return { success: true, count: result.count }
  })
