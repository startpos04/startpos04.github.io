/**
 * /qa/campaigns/:campaignId — Campaign detail with per-test lock states
 *
 * Phase 3 additions:
 *  - Open defect badge per test row (links to /qa/defects/:id)
 *  - Developer view toggle (source modules, condition IDs)
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent } from '@platform/components/ui/card'
import { Separator } from '@platform/components/ui/separator'
import { Skeleton } from '@platform/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@platform/components/ui/tooltip'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangleIcon, CheckCircle2Icon, ChevronRightIcon, CircleDashedIcon, CodeIcon, LockIcon, RotateCcwIcon, XCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CampaignDetail, TestLockState } from '@/lib/qa/campaign-service'
import { getCampaignDetail } from '@/lib/qa/campaign-service'
import { FEATURE_LABELS, RISK_COLORS } from '@/lib/qa/constants'
import type { DefectRow } from '@/lib/qa/defect-tracker'
import { getOpenDefectsByTestCase } from '@/lib/qa/defect-tracker'

export const Route = createFileRoute('/(private)/(dashboard)/qa/campaigns/$campaignId/')({
  component: CampaignDetailPage,
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function RiskBadge({ risk }: { risk: string }) {
  const c = RISK_COLORS[risk] ?? RISK_COLORS['LOW']!
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>{risk}</span>
}

function OutcomeIcon({ outcome }: { outcome: string | null }) {
  if (outcome === 'PASSED') return <CheckCircle2Icon className='size-4 text-green-500' />
  if (outcome === 'FAILED') return <XCircleIcon className='size-4 text-destructive' />
  if (outcome === 'BLOCKED') return <AlertTriangleIcon className='size-4 text-amber-500' />
  return <CircleDashedIcon className='size-4 text-muted-foreground' />
}

function OutcomeBadge({ outcome, retest }: { outcome: string | null; retest: boolean }) {
  if (retest) {
    return (
      <Badge variant='outline' className='text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800 gap-1'>
        <RotateCcwIcon className='size-3' />
        Retest required
      </Badge>
    )
  }
  if (!outcome)
    return (
      <Badge variant='secondary' className='text-muted-foreground'>
        Not run
      </Badge>
    )
  const map: Record<string, string> = {
    PASSED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
    FAILED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
    BLOCKED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
    SKIPPED: 'bg-muted text-muted-foreground',
  }
  return (
    <Badge variant='outline' className={map[outcome] ?? ''}>
      {outcome.charAt(0) + outcome.slice(1).toLowerCase()}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Test row — enhanced with defect badge and developer view
// ---------------------------------------------------------------------------

function TestRow({ ts, defect, devView }: { ts: TestLockState; defect: DefectRow | undefined; devView: boolean }) {
  const tc = ts.testCase
  const isLocked = ts.locked

  const defectBadge = defect && (
    <Link
      to='/qa/defects/$defectId'
      params={{ defectId: defect.id }}
      onClick={e => e.stopPropagation()}
      className='inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/50 transition-colors shrink-0'
    >
      <AlertTriangleIcon className='size-2.5' />
      {defect.status === 'RETEST_REQUIRED' ? 'Retest req.' : 'Defect'}
    </Link>
  )

  const rowContent = (
    <div className={`flex flex-col transition-colors ${isLocked ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50 cursor-pointer'}`}>
      <div className='flex items-center gap-3 px-4 py-3'>
        {/* Status icon */}
        <div className='w-5 shrink-0 flex justify-center'>
          {isLocked ? <LockIcon className='size-3.5 text-muted-foreground' /> : <OutcomeIcon outcome={ts.lastRun?.outcome ?? null} />}
        </div>

        {/* ID */}
        <span className='text-xs font-mono text-muted-foreground w-24 shrink-0'>{tc.id}</span>

        {/* Title */}
        <span className='flex-1 text-sm font-medium'>{tc.title}</span>

        {/* Risk */}
        <RiskBadge risk={tc.risk} />

        {/* Defect badge */}
        {defectBadge}

        {/* Outcome badge */}
        <OutcomeBadge outcome={ts.lastRun?.outcome ?? null} retest={ts.retestRequired} />

        {/* Arrow */}
        {!isLocked && <ChevronRightIcon className='size-4 text-muted-foreground shrink-0' />}
      </div>

      {/* Developer view expansion */}
      {devView && (
        <div className='px-4 pb-3 pl-12 flex flex-col gap-1 border-t bg-muted/20'>
          <div className='flex gap-4 text-xs text-muted-foreground pt-2'>
            <div>
              <span className='font-medium text-foreground'>Requires: </span>
              {tc.requires.join(', ') || '—'}
            </div>
          </div>
          <div className='flex gap-4 text-xs text-muted-foreground'>
            <div>
              <span className='font-medium text-foreground'>Establishes: </span>
              {tc.establishes.join(', ') || '—'}
            </div>
          </div>
          {tc.sourceModules.length > 0 && (
            <div className='text-xs text-muted-foreground'>
              <span className='font-medium text-foreground'>Source: </span>
              {tc.sourceModules.map((m, i) => (
                <span key={m} className='font-mono text-blue-600 dark:text-blue-400'>
                  {m}
                  {i < tc.sourceModules.length - 1 ? ', ' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )

  if (isLocked) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div>{rowContent}</div>
        </TooltipTrigger>
        <TooltipContent side='left' className='max-w-xs text-xs'>
          <p className='font-medium mb-1'>Prerequisites not met:</p>
          <ul className='space-y-0.5'>
            {ts.missingConditions.map(c => (
              <li key={c} className='font-mono text-muted-foreground'>
                {c}
              </li>
            ))}
          </ul>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Link to='/qa/tests/$testId' params={{ testId: tc.id }}>
      {rowContent}
    </Link>
  )
}

// ---------------------------------------------------------------------------
// Feature section
// ---------------------------------------------------------------------------

function FeatureSection({
  feature,
  tests,
  defectMap,
  devView,
}: {
  feature: string
  tests: TestLockState[]
  defectMap: Record<string, DefectRow>
  devView: boolean
}) {
  const passed = tests.filter(t => t.lastRun?.outcome === 'PASSED').length
  const total = tests.length
  const openDefects = tests.filter(t => defectMap[t.testCase.id]).length
  const label = FEATURE_LABELS[feature] ?? feature

  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <div className='flex items-center gap-2'>
          <h2 className='text-sm font-semibold text-muted-foreground uppercase tracking-wide'>{label}</h2>
          {openDefects > 0 && (
            <span className='text-xs text-destructive font-medium'>
              {openDefects} defect{openDefects > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <span className='text-xs text-muted-foreground'>
          {passed}/{total} passed
        </span>
      </div>
      <Card>
        <CardContent className='p-0 divide-y'>
          {tests.map(ts => (
            <TestRow key={ts.testCase.id} ts={ts} defect={defectMap[ts.testCase.id]} devView={devView} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function CampaignDetailPage() {
  const { campaignId } = Route.useParams()
  const [detail, setDetail] = useState<CampaignDetail | null>(null)
  const [defectMap, setDefectMap] = useState<Record<string, DefectRow>>({})
  const [loading, setLoading] = useState(true)
  const [devView, setDevView] = useState(false)

  useEffect(() => {
    Promise.all([getCampaignDetail({ data: { campaignId } }), getOpenDefectsByTestCase()])
      .then(([d, dm]) => {
        setDetail(d)
        setDefectMap(dm ?? {})
      })
      .catch(() => setDetail(null))
      .finally(() => setLoading(false))
  }, [campaignId])

  if (loading) {
    return (
      <div className='p-6 max-w-5xl mx-auto space-y-4'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-96' />
        <div className='space-y-2 mt-6'>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full' />
          ))}
        </div>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className='p-6 max-w-5xl mx-auto'>
        <p className='text-destructive text-sm'>Campaign not found.</p>
        <Link to='/qa' className='text-sm text-primary hover:underline mt-2 block'>
          ← Back to QA
        </Link>
      </div>
    )
  }

  const featureOrder = ['auth', 'pos', 'inventory', 'billing', 'permissions']
  const grouped = new Map<string, TestLockState[]>()
  for (const ts of detail.tests) {
    const f = ts.testCase.feature
    if (!grouped.has(f)) grouped.set(f, [])
    grouped.get(f)!.push(ts)
  }

  const totalTests = detail.tests.length
  const passedTests = detail.tests.filter(t => t.lastRun?.outcome === 'PASSED').length
  const lockedTests = detail.tests.filter(t => t.locked).length
  const openDefectsTotal = Object.keys(defectMap).length

  return (
    <div className='h-full overflow-y-auto p-6 max-w-5xl mx-auto space-y-6'>
      <Link to='/qa' className='text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1'>
        ← Campaigns
      </Link>

      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <h1 className='text-2xl font-bold'>{detail.name}</h1>
            {detail.targetBuild && (
              <Badge variant='outline' className='font-mono text-xs'>
                {detail.targetBuild}
              </Badge>
            )}
          </div>
          {detail.description && <p className='text-sm text-muted-foreground'>{detail.description}</p>}
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' onClick={() => setDevView(v => !v)} className={devView ? 'bg-muted' : ''}>
            <CodeIcon className='size-4 mr-2' />
            {devView ? 'Hide dev view' : 'Dev view'}
          </Button>
          <Button variant='outline' size='sm' asChild>
            <Link to='/qa/defects'>
              <AlertTriangleIcon className='size-4 mr-2' />
              Defects
              {openDefectsTotal > 0 && (
                <span className='ml-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full px-1.5'>{openDefectsTotal}</span>
              )}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className='grid grid-cols-4 gap-3'>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground mb-1'>Passed</p>
            <p className='text-2xl font-bold text-green-600'>
              {passedTests}
              <span className='text-sm text-muted-foreground font-normal'>/{totalTests}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground mb-1'>Locked</p>
            <p className='text-2xl font-bold text-muted-foreground'>{lockedTests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground mb-1'>Not run</p>
            <p className='text-2xl font-bold'>{totalTests - passedTests - detail.tests.filter(t => t.lastRun && t.lastRun.outcome !== 'PASSED').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <p className='text-xs text-muted-foreground mb-1'>Open defects</p>
            <p className={`text-2xl font-bold ${openDefectsTotal > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{openDefectsTotal}</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Test sections */}
      <div className='space-y-6'>
        {featureOrder.map(feature => {
          const tests = grouped.get(feature)
          if (!tests?.length) return null
          return <FeatureSection key={feature} feature={feature} tests={tests} defectMap={defectMap} devView={devView} />
        })}
      </div>
    </div>
  )
}
