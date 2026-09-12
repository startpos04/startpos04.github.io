/** biome-ignore-all lint/suspicious/noExplicitAny: flexibility required */

import {
  businessCollection,
  notificationCollection,
  userCollection,
} from '@platform/db/collections'
import { and, eq, ilike, or, useLiveQuery } from '@tanstack/react-db'

// ---------------------------------------------------------------------------
// Output type
// ---------------------------------------------------------------------------

export interface AdminNotification {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  link: string | null
  createdAt: Date | null
  archivedAt: Date | null
  businessId: string
  businessName: string
  userId: string
  userName: string | null
  userEmail: string
}

export interface FetchNotificationsProps {
  searchQuery?: string
  typeFilter?: string
}

// ---------------------------------------------------------------------------
// Shared select shape
// ---------------------------------------------------------------------------

const selectNotif = ({ notif, business, user }: any) => ({
  id: notif.id,
  title: notif.title,
  message: notif.message,
  type: notif.type as string,
  priority: notif.priority as string,
  isRead: notif.isRead,
  link: notif.link ?? null,
  createdAt: (notif as any).createdAt ?? null,
  archivedAt: (notif as any).archivedAt ?? null,
  businessId: notif.businessId,
  businessName: business?.name ?? '—',
  userId: notif.userId,
  userName: user?.name ?? null,
  userEmail: user?.email ?? '—',
})

// ---------------------------------------------------------------------------
// fetchNotifications
// ---------------------------------------------------------------------------

export const fetchNotifications = ({ searchQuery, typeFilter }: FetchNotificationsProps) => {
  const base = (q: any) =>
    q
      .from({ notif: notificationCollection })
      .leftJoin({ business: businessCollection }, ({ notif, business }: any) => eq(notif.businessId, business.id))
      .leftJoin({ user: userCollection }, ({ notif, user }: any) => eq(notif.userId, user.id))

  // ── No filters ────────────────────────────────────────────────────────
  const resultAll = useLiveQuery(
    q =>
      base(q)
        .orderBy(({ notif }: any) => notif.createdAt, 'desc')
        .select(selectNotif),
    [],
  )

  // ── With filters ──────────────────────────────────────────────────────
  const resultFiltered = useLiveQuery(
    q =>
      base(q)
        .where(({ notif, business }: any) =>
          and(
            searchQuery
              ? or(
                  ilike(notif.title, `%${searchQuery}%`),
                  ilike(notif.message, `%${searchQuery}%`),
                  ilike(business.name, `%${searchQuery}%`),
                )
              : undefined,
            typeFilter ? eq(notif.type as any, typeFilter as any) : undefined,
          ),
        )
        .orderBy(({ notif }: any) => notif.createdAt, 'desc')
        .select(selectNotif),
    [searchQuery, typeFilter],
  )

  const hasFilter = !!(searchQuery || typeFilter)
  const raw = hasFilter ? resultFiltered : resultAll

  // ── Post-query: exclude archived, cast Date fields ────────────────────
  const data: AdminNotification[] = (raw.data ?? [])
    .filter((n: any) => !n.archivedAt)
    .map((n: any) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type ?? '',
      priority: n.priority ?? '',
      isRead: n.isRead,
      link: n.link ?? null,
      createdAt: n.createdAt instanceof Date ? n.createdAt : null,
      archivedAt: n.archivedAt instanceof Date ? n.archivedAt : null,
      businessId: n.businessId,
      businessName: n.businessName ?? '—',
      userId: n.userId,
      userName: n.userName ?? null,
      userEmail: n.userEmail ?? '—',
    }))

  return {
    data,
    isLoading: raw.isLoading,
    total: data.length,
  }
}
