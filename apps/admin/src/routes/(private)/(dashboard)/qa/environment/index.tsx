/**
 * /qa/environment — QA environment status + reset
 * 2-column layout: status checks (left) · reset panel (right, SUPERADMIN only)
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Input } from '@platform/components/ui/input'
import { Skeleton } from '@platform/components/ui/skeleton'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangleIcon, CheckCircle2Icon, RefreshCwIcon, RotateCcwIcon, XCircleIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { getEnvironmentStatus } from '@/lib/qa/campaign-service'
import type { ResetResult } from '@/lib/qa/environment-reset'
import { resetQaEnvironment } from '@/lib/qa/environment-reset'

export const Route = createFileRoute('/(private)/(dashboard)/qa/environment/')({
  component: QaEnvironmentPage,
})

type EnvStatus = Awaited<ReturnType<typeof getEnvironmentStatus>>

// ---------------------------------------------------------------------------
// CheckRow
// ---------------------------------------------------------------------------

function CheckRow({ label, ok, detail, children }: { label: string; ok: boolean; detail?: string; children?: React.ReactNode }) {
  return (
    <div className='flex items-start gap-3 py-2.5'>
      <div className='mt-0.5 shrink-0'>{ok ? <CheckCircle2Icon className='size-4 text-green-500' /> : <XCircleIcon className='size-4 text-destructive' />}</div>
      <div className='flex-1 min-w-0'>
        <p className='text-sm font-medium'>{label}</p>
        {detail && <p className='text-xs text-muted-foreground mt-0.5'>{detail}</p>}
        {children}
      </div>
    </div>
  )
}

function SubStatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant='destructive'>Missing</Badge>
  if (['TRIAL', 'ACTIVE', 'GRACE_PERIOD'].includes(status))
    return (
      <Badge variant='default' className='bg-green-600'>
        {status}
      </Badge>
    )
  return <Badge variant='destructive'>{status}</Badge>
}

// ---------------------------------------------------------------------------
// Left column — status checks
// ---------------------------------------------------------------------------

function StatusColumn({ status, isSuperAdmin }: { status: EnvStatus; isSuperAdmin: boolean }) {
  const allOk =
    status.accounts.cashier &&
    status.accounts.admin &&
    status.accounts.supervisor &&
    status.branch &&
    status.business &&
    ['TRIAL', 'ACTIVE', 'GRACE_PERIOD'].includes(status.subscriptionStatus ?? '') &&
    status.chickenStock >= 2

  return (
    <div className='space-y-4'>
      {/* Overall status banner */}
      {!allOk && (
        <div className='flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 px-4 py-3 text-sm text-amber-800 dark:text-amber-300'>
          <AlertTriangleIcon className='size-4 shrink-0 mt-0.5' />
          <span>
            Some prerequisites are not met. Tests that depend on missing data will be locked.
            {isSuperAdmin ? (
              ' Use the reset panel to restore a clean baseline.'
            ) : (
              <>
                {' '}
                Run <code className='text-xs bg-amber-100 px-1 rounded'>pnpm db:seed</code> to restore.
              </>
            )}
          </span>
        </div>
      )}

      {/* E2E Accounts */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>E2E Accounts</CardTitle>
          <CardDescription className='text-xs'>Tenant accounts used during test execution</CardDescription>
        </CardHeader>
        <CardContent className='divide-y'>
          <CheckRow label='Cashier' ok={status.accounts.cashier} detail='e2e.cashier@test.com' />
          <CheckRow label='Admin' ok={status.accounts.admin} detail='e2e.admin@test.com' />
          <CheckRow label='Supervisor' ok={status.accounts.supervisor} detail='e2e.supervisor@test.com' />
        </CardContent>
      </Card>

      {/* Business Setup */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Business Setup</CardTitle>
          <CardDescription className='text-xs'>E2E business and branch records</CardDescription>
        </CardHeader>
        <CardContent className='divide-y'>
          <CheckRow label='E2E Test Restaurant' ok={status.business} detail={!status.business ? 'Not found — run E2E seeder' : undefined} />
          <CheckRow label='E2E Main Branch' ok={status.branch} detail={!status.branch ? 'Not found — run E2E seeder' : undefined} />
          <div className='flex items-center gap-3 py-2.5'>
            <div className='mt-0.5 shrink-0'>
              {['TRIAL', 'ACTIVE', 'GRACE_PERIOD'].includes(status.subscriptionStatus ?? '') ? (
                <CheckCircle2Icon className='size-4 text-green-500' />
              ) : (
                <XCircleIcon className='size-4 text-destructive' />
              )}
            </div>
            <div className='flex-1 flex items-center justify-between'>
              <p className='text-sm font-medium'>Subscription</p>
              <SubStatusBadge status={status.subscriptionStatus} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Runtime State */}
      <Card>
        <CardHeader className='pb-2'>
          <CardTitle className='text-sm'>Runtime State</CardTitle>
          <CardDescription className='text-xs'>Stock levels and open vendor sessions</CardDescription>
        </CardHeader>
        <CardContent className='divide-y'>
          <CheckRow label='Chicken Meal has stock' ok={status.chickenStock >= 2} detail={`${status.chickenStock} units (need ≥ 2)`} />
          <div className='flex items-start gap-3 py-2.5'>
            <div className='mt-0.5 shrink-0'>
              {status.openVendorSession ? <CheckCircle2Icon className='size-4 text-green-500' /> : <AlertTriangleIcon className='size-4 text-amber-500' />}
            </div>
            <div className='flex-1'>
              <p className='text-sm font-medium'>Vendor session (shift)</p>
              <p className='text-xs text-muted-foreground mt-0.5'>{status.openVendorSession ? 'Shift is open' : 'No open shift'}</p>
              {!status.openVendorSession && (
                <Link to='/qa/tests/$testId/run' params={{ testId: 'TC-SESS-001' }} className='text-xs text-primary hover:underline mt-1 inline-block'>
                  → Run TC-SESS-001: Open a Shift
                </Link>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <p className='text-xs text-muted-foreground text-center pt-1'>All checks query the DB directly — no cache.</p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Right column — summary + reset panel
// ---------------------------------------------------------------------------

function SummaryColumn({ status, isSuperAdmin, onResetComplete }: { status: EnvStatus; isSuperAdmin: boolean; onResetComplete: () => void }) {
  const [token, setToken] = useState('')
  const [resetting, setResetting] = useState(false)
  const [result, setResult] = useState<ResetResult | null>(null)

  const handleReset = async () => {
    if (token !== 'RESET') return
    setResetting(true)
    setResult(null)
    try {
      const r = await resetQaEnvironment({ data: { confirmationToken: token } })
      setResult(r)
      if (r.ok) {
        setToken('')
        onResetComplete()
      }
    } catch (err) {
      setResult({ ok: false, error: err instanceof Error ? err.message : 'Unknown error.' })
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className='space-y-4'>
      {/* Reset panel — SUPERADMIN only */}
      {isSuperAdmin && (
        <Card className='border-destructive/30'>
          <CardHeader className='pb-3'>
            <div className='flex items-center gap-2'>
              <RotateCcwIcon className='size-4 text-destructive' />
              <CardTitle className='text-sm text-destructive'>Reset Environment</CardTitle>
            </div>
            <CardDescription className='text-xs'>
              Wipes all E2E data and re-seeds from scratch. Clears all condition states.
              <strong className='block mt-1 text-amber-700 dark:text-amber-400'>Irreversible — QA/dev only.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {result && (
              <div
                className={`rounded-lg border px-3 py-2.5 text-xs ${
                  result.ok
                    ? 'border-green-200 bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-300'
                    : 'border-destructive/30 bg-destructive/5 text-destructive'
                }`}
              >
                {result.ok ? (
                  <div className='space-y-1'>
                    <p className='font-medium'>✅ Reset complete</p>
                    {result.summary && (
                      <ul className='space-y-0.5 mt-1'>
                        <li>Businesses deleted: {result.summary.businessesDeleted}</li>
                        <li>Conditions cleared: {result.summary.conditionStatesCleared}</li>
                        <li>Accounts restored: {result.summary.accountsRestored}</li>
                        <li>Duration: {(result.summary.durationMs / 1000).toFixed(1)}s</li>
                      </ul>
                    )}
                  </div>
                ) : (
                  <p>{result.error}</p>
                )}
              </div>
            )}

            <div className='space-y-1.5'>
              <label className='text-xs font-medium text-muted-foreground'>
                Type <code className='bg-muted px-1 rounded font-mono text-xs'>RESET</code> to confirm
              </label>
              <Input
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder='RESET'
                className='font-mono text-sm'
                onKeyDown={e => {
                  if (e.key === 'Enter' && token === 'RESET') handleReset()
                }}
              />
            </div>

            <Button variant='destructive' size='sm' className='w-full' disabled={token !== 'RESET' || resetting} onClick={handleReset}>
              {resetting ? (
                <>
                  <RefreshCwIcon className='size-4 mr-2 animate-spin' />
                  Resetting… (30–60s)
                </>
              ) : (
                <>
                  <RotateCcwIcon className='size-4 mr-2' />
                  Reset QA Environment
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QaEnvironmentPage() {
  const user = useAuthenticatedUser()
  const isSuperAdmin = user?.role === 'SUPERADMIN'

  const [status, setStatus] = useState<EnvStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    setLoading(true)
    getEnvironmentStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const allOk = status
    ? status.accounts.cashier &&
      status.accounts.admin &&
      status.accounts.supervisor &&
      status.branch &&
      status.business &&
      ['TRIAL', 'ACTIVE', 'GRACE_PERIOD'].includes(status.subscriptionStatus ?? '') &&
      status.chickenStock >= 2
    : false

  return (
    <div className='h-full overflow-hidden'>
      {/* Header */}
      <div className='flex items-start justify-between gap-4 px-6 pt-6 pb-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <h1 className='text-2xl font-bold'>QA Environment</h1>
            {!loading && status && (allOk ? <Badge className='bg-green-600'>Ready</Badge> : <Badge variant='destructive'>Not ready</Badge>)}
          </div>
          <p className='text-sm text-muted-foreground'>Live fixture checks — queries the database directly on every refresh.</p>
        </div>
        <Button variant='outline' size='sm' onClick={refresh} disabled={loading}>
          <RefreshCwIcon className={`size-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && (
        <div className='grid grid-cols-12 gap-0'>
          <div className='col-span-7 px-6 pb-6 space-y-3'>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className='h-36 w-full' />
            ))}
          </div>
          <div className='col-span-5 border-l px-6 pb-6 space-y-3'>
            <Skeleton className='h-56 w-full' />
            {isSuperAdmin && <Skeleton className='h-48 w-full' />}
          </div>
        </div>
      )}

      {!loading && !status && (
        <div className='px-6 pb-6'>
          <Card>
            <CardContent className='py-8 text-center text-sm text-destructive'>Failed to load environment status.</CardContent>
          </Card>
        </div>
      )}

      {/* 7/12 + 5/12 layout */}
      {!loading && status && (
        <div className='grid grid-cols-12 items-start overflow-y-auto flex-1 min-h-0'>
          <div className='col-span-7 px-6 pb-6'>
            <StatusColumn status={status} isSuperAdmin={isSuperAdmin} />
          </div>
          <div className='col-span-5 px-6 pb-6'>
            <SummaryColumn status={status} isSuperAdmin={isSuperAdmin} onResetComplete={refresh} />
          </div>
        </div>
      )}
    </div>
  )
}
