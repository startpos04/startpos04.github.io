/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import { auditLogCollection, businessCollection, userCollection } from '@platform/db/collections'
import { and, eq, ilike, or, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminAuditLogRow {
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
  createdAt: Date | null
}

export interface FetchAuditLogsProps {
  searchQuery?: string
  actionFilter?: string
}

// ---------------------------------------------------------------------------
// fetchAuditLogs
// ---------------------------------------------------------------------------

export const fetchAuditLogs = ({ searchQuery, actionFilter }: FetchAuditLogsProps = {}) => {
  // ── All logs ──────────────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      q
        .from({ log: auditLogCollection })
        .leftJoin({ business: businessCollection }, ({ log, business }) =>
          eq(log.businessId, business.id),
        )
        .orderBy(({ log }) => (log as any).createdAt, 'desc')
        .select(({ log, business }) => ({
          id: log.id,
          businessId: log.businessId,
          businessName: business?.name ?? '—',
          actorId: log.actorId,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          before: log.before as Record<string, unknown> | null,
          after: log.after as Record<string, unknown> | null,
          ipAddress: log.ipAddress ?? null,
          createdAt: (log as any).createdAt ?? null,
        })),
    [],
  )

  // ── With filters ──────────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      q
        .from({ log: auditLogCollection })
        .leftJoin({ business: businessCollection }, ({ log, business }) =>
          eq(log.businessId, business.id),
        )
        .where(({ log, business }) =>
          and(
            searchQuery
              ? or(
                  ilike(log.action, `%${searchQuery}%`),
                  ilike(log.targetType, `%${searchQuery}%`),
                  ilike(log.actorId, `%${searchQuery}%`),
                  ilike(business.name, `%${searchQuery}%`),
                )
              : undefined,
            actionFilter ? eq(log.action as any, actionFilter as any) : undefined,
          ),
        )
        .orderBy(({ log }) => (log as any).createdAt, 'desc')
        .select(({ log, business }) => ({
          id: log.id,
          businessId: log.businessId,
          businessName: business?.name ?? '—',
          actorId: log.actorId,
          action: log.action,
          targetType: log.targetType,
          targetId: log.targetId,
          before: log.before as Record<string, unknown> | null,
          after: log.after as Record<string, unknown> | null,
          ipAddress: log.ipAddress ?? null,
          createdAt: (log as any).createdAt ?? null,
        })),
    [searchQuery, actionFilter],
  )

  // ── Actor details from userCollection ─────────────────────────────────
  const allUsers = useLiveQuery(
    q => q.from({ user: userCollection }),
    [],
  )

  const hasFilter = !!(searchQuery || actionFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: inject actor name/email + cast Date ───────────────────
  const actorMap = new Map<string, { name: string | null; email: string }>()
  for (const u of allUsers.data ?? []) {
    actorMap.set(u.id, { name: u.name, email: u.email })
  }

  // Collect distinct actions for the filter dropdown
  const distinctActions = [...new Set((resultAll.data ?? []).map(l => l.action))].sort()

  const data: AdminAuditLogRow[] = (raw.data ?? []).map(l => {
    const actor = actorMap.get((l as any).actorId)
    return {
      id: (l as any).id ?? '',
      businessId: (l as any).businessId ?? '',
      businessName: (l as any).businessName ?? '—',
      actorId: (l as any).actorId ?? '',
      actorName: actor?.name ?? null,
      actorEmail: actor?.email ?? null,
      action: (l as any).action ?? '',
      targetType: (l as any).targetType ?? '',
      targetId: (l as any).targetId ?? '',
      before: (l as any).before ?? null,
      after: (l as any).after ?? null,
      ipAddress: (l as any).ipAddress ?? null,
      createdAt: (l as any).createdAt instanceof Date ? (l as any).createdAt : null,
    }
  })

  return {
    data,
    distinctActions,
    isLoading: raw.isLoading || allUsers.isLoading,
    total: data.length,
  }
}
