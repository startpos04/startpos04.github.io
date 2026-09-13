/**
 * Branch Billing History Tab
 *
 * Displays transaction history for credit purchases and usage.
 *
 * Online:  fetches from server via getBranchCreditBalance (authoritative, includes actor names).
 * Offline: reads from the local creditLedgerCollection so the tab still renders
 *          with cached data instead of showing a broken/empty state.
 */

import { getColumns } from '@platform/components/custom/data-view'
import { TableView } from '@platform/components/custom/data-view/table-view'
import { OfflineIndicator } from '@platform/components/custom/offline-indicator'
import { creditLedgerCollection } from '@platform/db/collections'
import { useIsOnline } from '@platform/hooks/use-is-online'
import { eq, useLiveQuery } from '@tanstack/react-db'
import { useQuery } from '@tanstack/react-query'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { invoiceCols } from '@/lib/columns/invoice-columns'
import { getBranchCreditBalance } from '@/lib/server-fn/get-branch-credit-balance'

export function HistoryTab() {
  const isOnline = useIsOnline()
  const user = useAuthenticatedUser()

  // ── Online path ────────────────────────────────────────────────────────────
  const { data: creditData, isLoading: onlineLoading } = useQuery({
    queryKey: ['branch-credit-balance'],
    queryFn: () => getBranchCreditBalance(),
    staleTime: 1000 * 60 * 5,
    enabled: isOnline,
  })

  // ── Offline path ───────────────────────────────────────────────────────────
  // creditLedgerCollection is syncMode:'on-demand' — it populates the first
  // time the billing page is opened online. After that the data is cached in
  // OPFS and available offline.
  const offlineLedger = useLiveQuery(
    q =>
      q
        .from({ cl: creditLedgerCollection })
        .where(({ cl }) => eq(cl.businessId, user.business.id))
        .orderBy(({ cl }) => cl.createdAt, 'desc')
        .select(({ cl }) => cl),
    [user.business.id],
  )

  // Shape the offline rows to match the server response shape that invoiceCols expects
  const offlineEntries = (offlineLedger.data ?? []).map(e => ({
    id: e.id,
    eventType: e.eventType,
    amount: e.amount,
    balanceAfter: e.balanceAfter,
    transactionId: e.transactionId ?? null,
    note: e.note ?? null,
    actorId: e.actorId ?? null,
    actorName: null, // actor name lookup requires a server call — omitted offline
    createdAt: e.createdAt,
  }))

  // ── Merge ──────────────────────────────────────────────────────────────────
  const entries = isOnline ? (creditData?.entries ?? []) : offlineEntries
  const isLoading = isOnline ? onlineLoading : offlineLedger.isLoading

  const columns = getColumns<(typeof entries)[number]>(h => [
    invoiceCols.dateWithTime(h),
    invoiceCols.creditEventType(h),
    invoiceCols.creditDescription(h),
    invoiceCols.creditAmount(h),
    invoiceCols.creditBalanceAfter(h),
  ])

  return (
    <div className='space-y-4 grow flex flex-col px-4'>
      {/* Offline notice */}
      <OfflineIndicator message='Showing cached credit history. Actor names are unavailable offline.' />

      {/* Header section */}
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold'>Credit Transaction History</h2>
        <p className='text-sm text-muted-foreground'>All credit purchases and usage for this branch.</p>
      </div>

      <TableView
        data={entries}
        columns={columns}
        isFetching={isLoading}
        emptyMessage='No credit transactions found. Credit purchases and usage will appear here.'
      />
    </div>
  )
}
