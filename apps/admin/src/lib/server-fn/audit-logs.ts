/**
 * audit-logs.ts — Admin server functions for viewing audit logs
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

export interface AuditLogRow {
  id: string
  businessId: string
  businessName: string
  actorId: string
  actorName: string | null
  actorEmail: string | null
  action: string
  targetType: string
  targetId: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  ipAddress: string | null
  createdAt: string
}

export interface FetchAuditLogsInput {
  search?: string
  action?: string
  businessId?: string
  page: number
  pageSize: number
}

// biome-ignore lint/suspicious/noExplicitAny: TanStack Start inputValidator/handler type narrowing known issue — same as getCampaignDetail
export const fetchAuditLogs: any = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { search?: string; action?: string; businessId?: string; page: number; pageSize: number }) => d)
  .handler(async ({ data }: any) => {
    const { search, action, businessId, page, pageSize } = data as FetchAuditLogsInput
    const skip = (page - 1) * pageSize

    const where = {
      ...(businessId ? { businessId } : {}),
      ...(action ? { action } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { action: { contains: search, mode: 'insensitive' as const } },
              { targetType: { contains: search, mode: 'insensitive' as const } },
              { targetId: { contains: search, mode: 'insensitive' as const } },
              { actorId: { contains: search, mode: 'insensitive' as const } },
              { business: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    }

    const [logs, total] = await Promise.all([
      rootPrisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          business: { select: { name: true } },
        },
      }),
      rootPrisma.auditLog.count({ where }),
    ])

    // Resolve actor names from the tenant User table
    const actorIds = [...new Set(logs.map(l => l.actorId))]
    const actors = await rootPrisma.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, name: true, email: true },
    })
    const actorMap = new Map(actors.map(a => [a.id, a]))

    return {
      total,
      rows: logs.map(l => {
        const actor = actorMap.get(l.actorId)
        return {
          id: l.id,
          businessId: l.businessId,
          businessName: (l as { business?: { name: string } }).business?.name ?? '—',
          actorId: l.actorId,
          actorName: actor?.name ?? null,
          actorEmail: actor?.email ?? null,
          action: l.action,
          targetType: l.targetType,
          targetId: l.targetId,
          before: l.before as Record<string, unknown> | null,
          after: l.after as Record<string, unknown> | null,
          ipAddress: l.ipAddress,
          createdAt: l.createdAt.toISOString(),
        }
      }),
    }
  })

export const fetchDistinctActions = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<string[]> => {
    const rows = await rootPrisma.auditLog.findMany({
      distinct: ['action'],
      select: { action: true },
      orderBy: { action: 'asc' },
    })
    return rows.map(r => r.action)
  })
