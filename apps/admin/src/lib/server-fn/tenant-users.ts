/**
 * tenant-users.ts — Admin server functions for tenant user management
 *
 * Read-only search across all tenant User records (support use-case).
 * Danger actions: revoke sessions, disable account.
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

export interface TenantUserRow {
  id: string
  name: string
  email: string
  role: string
  image: string | null
  emailVerified: boolean
  contactNumber: string | null
  deletedAt: string | null
  createdAt: string
  // membership snapshot (first membership found)
  businessId: string | null
  businessName: string | null
  branchName: string | null
  // activity counts
  salesCount: number
  servicesCount: number
  // session
  hasActiveSession: boolean
}

// ---------------------------------------------------------------------------
// listTenantUsers — paginated, searchable, filterable by role
// ---------------------------------------------------------------------------

export const listTenantUsers = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { search?: string; role?: string; page: number; pageSize: number }) => d)
  .handler(async ({ data }: any) => {
    const { search, role, page, pageSize } = data as {
      search?: string; role?: string; page: number; pageSize: number
    }
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [users, total] = await Promise.all([
      rootPrisma.user.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
        include: {
          memberships: {
            take: 1,
            include: {
              business: { select: { id: true, name: true } },
              branch: { select: { name: true } },
            },
          },
          _count: {
            select: {
              processedSales: true,
              performedServices: true,
              sessions: true,
            },
          },
        },
      }),
      rootPrisma.user.count({ where }),
    ])

    const rows: TenantUserRow[] = users.map(u => {
      const m = u.memberships[0]
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        image: u.image,
        emailVerified: u.emailVerified,
        contactNumber: u.contactNumber,
        deletedAt: (u as any).deletedAt?.toISOString() ?? null,
        createdAt: (u as any).createdAt?.toISOString() ?? '',
        businessId: m?.businessId ?? null,
        businessName: m?.business?.name ?? null,
        branchName: m?.branch?.name ?? null,
        salesCount: u._count.processedSales,
        servicesCount: u._count.performedServices,
        hasActiveSession: u._count.sessions > 0,
      }
    })

    return { rows, total }
  })

// ---------------------------------------------------------------------------
// getTenantUserDetail — full detail for the sidebar
// ---------------------------------------------------------------------------

export const getTenantUserDetail = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }) => {
    const user = await rootPrisma.user.findUnique({
      where: { id: data.userId },
      include: {
        memberships: {
          include: {
            business: { select: { id: true, name: true, logo: true } },
            branch: { select: { name: true } },
          },
        },
        sessions: {
          select: { id: true, ipAddress: true, userAgent: true, expiresAt: true },
          orderBy: { expiresAt: 'desc' },
          take: 5,
        },
        _count: {
          select: { processedSales: true, performedServices: true, inventoryMovements: true },
        },
      },
    })
    return user
  })

// ---------------------------------------------------------------------------
// revokeUserSessions
// ---------------------------------------------------------------------------

export const revokeUserSessions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const result = await rootPrisma.session.deleteMany({ where: { userId: data.userId } })
    return { success: true, message: `${result.count} session${result.count !== 1 ? 's' : ''} revoked.` }
  })

// ---------------------------------------------------------------------------
// disableUser — soft delete
// ---------------------------------------------------------------------------

export const disableUser = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.user.update({
      where: { id: data.userId },
      data: { deletedAt: new Date() },
    })
    return { success: true, message: 'Account disabled. User cannot log in.' }
  })

// ---------------------------------------------------------------------------
// enableUser — restore soft-deleted account
// ---------------------------------------------------------------------------

export const enableUser = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { userId: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.user.update({
      where: { id: data.userId },
      data: { deletedAt: null },
    })
    return { success: true, message: 'Account re-enabled.' }
  })
