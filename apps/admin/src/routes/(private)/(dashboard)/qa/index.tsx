/**
 * /qa — QA Companion campaign dashboard
 *
 * Phase 4 additions:
 *  - V1 Certification panel above campaign cards showing readiness status + blockers
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Progress } from '@platform/components/ui/progress'
import { Separator } from '@platform/components/ui/separator'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangleIcon, CheckCircle2Icon, ClipboardListIcon, FlaskConicalIcon, PlayIcon, ShieldCheckIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CampaignSummary } from '@/lib/qa/campaign-service'
import { getCampaigns } from '@/lib/qa/campaign-service'

export const Route = createFileRoute('/(private)/(dashboard)/qa/')({
  component: QaDashboardPage,
})

// ---------------------------------------------------------------------------
// V1 Certification panel
// ---------------------------------------------------------------------------

function V1CertificationPanel({ campaigns }: { campaigns: CampaignSummary[] }) {
  if (campaigns.length === 0) return null

  const c = campaigns[0]
  if (!c) return null

  const workflowProgress = c.workflowProgress ?? []
  const totalTests = workflowProgress.reduce((s, w) => s + w.total, 0)
  const passedTests = workflowProgress.reduce((s, w) => s + w.passed, 0)
  const untestedTests = totalTests - passedTests
  const openCriticalDefects = c.openCriticalDefects ?? 0
  const openHighDefects = c.openHighDefects ?? 0

  // Blockers
  const blockers: string[] = []
  if (openCriticalDefects > 0) blockers.push(`${openCriticalDefects} open CRITICAL defect${openCriticalDefects > 1 ? 's' : ''}`)
  if (openHighDefects > 0) blockers.push(`${openHighDefects} open HIGH defect${openHighDefects > 1 ? 's' : ''}`)
  if (untestedTests > 0) blockers.push(`${untestedTests} test${untestedTests > 1 ? 's' : ''} not yet run`)

  const isReady = blockers.length === 0 && passedTests === totalTests

  return (
    <Card className={`border-2 ${isReady ? 'border-green-400/50' : 'border-amber-300/50'}`}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <ShieldCheckIcon className={`size-5 ${isReady ? 'text-green-500' : 'text-amber-500'}`} />
            <CardTitle className='text-base'>V1 Certification Status</CardTitle>
          </div>
          <Badge
            variant='outline'
            className={
              isReady
                ? 'bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800'
            }
          >
            {isReady ? '✓ READY' : '✗ NOT READY'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Metrics grid */}
        <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className='text-2xl font-bold text-green-600'>{passedTests}</p>
            <p className='text-xs text-muted-foreground'>Tests passed</p>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className={`text-2xl font-bold ${untestedTests > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{untestedTests}</p>
            <p className='text-xs text-muted-foreground'>Not run</p>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className={`text-2xl font-bold ${openCriticalDefects > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{openCriticalDefects}</p>
            <p className='text-xs text-muted-foreground'>Critical defects</p>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className={`text-2xl font-bold ${openHighDefects > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{openHighDefects}</p>
            <p className='text-xs text-muted-foreground'>High defects</p>
          </div>
        </div>

        {/* Blockers list */}
        {!isReady && blockers.length > 0 && (
          <div className='rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 px-4 py-3 space-y-1.5'>
            <p className='text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5'>
              <AlertTriangleIcon className='size-3.5' />
              V1 blockers
            </p>
            <ul className='space-y-1'>
              {blockers.map((b, i) => (
                <li key={i} className='text-sm text-amber-900 dark:text-amber-300 flex items-start gap-2'>
                  <span className='text-amber-500 mt-0.5'>·</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {isReady && (
          <div className='flex items-center gap-2 text-sm text-green-700'>
            <CheckCircle2Icon className='size-4' />
            All criteria met. Ready for V1 launch.
          </div>
        )}

        <div className='flex gap-2 pt-1'>
          <Button size='sm' variant='outline' asChild>
            <Link to='/qa/defects'>View defects</Link>
          </Button>
          <Button size='sm' variant='outline' asChild>
            <Link to='/qa/tests'>View all tests</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// V1 readiness bar (per campaign card)
// ---------------------------------------------------------------------------

function V1ReadinessBar({ summary }: { summary: CampaignSummary }) {
  const workflowProgress = summary.workflowProgress ?? []
  const total = workflowProgress.reduce((s, w) => s + w.total, 0)
  const passed = workflowProgress.reduce((s, w) => s + w.passed, 0)
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0
  const isBlocked = (summary.openCriticalDefects ?? 0) > 0 || (summary.openHighDefects ?? 0) > 0

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between text-sm'>
        <span className='font-medium'>Overall coverage</span>
        <span className='text-muted-foreground tabular-nums'>
          {passed}/{total} tests passed
        </span>
      </div>
      <Progress value={pct} className='h-2' />

      <div className='grid gap-2 pt-1'>
        {workflowProgress.map(w => (
          <div key={w.feature} className='flex items-center gap-3'>
            <span className='text-xs text-muted-foreground w-36 shrink-0'>{w.label}</span>
            <Progress value={w.pct} className='h-1.5 flex-1' />
            <span className='text-xs tabular-nums text-muted-foreground w-14 text-right'>
              {w.passed}/{w.total}
              {w.pct === 100 && <CheckCircle2Icon className='inline ml-1 size-3 text-green-500' />}
            </span>
          </div>
        ))}
      </div>

      <Separator />

      <div className='flex gap-4'>
        <div className={`flex items-center gap-1.5 text-sm ${summary.openCriticalDefects > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
          {summary.openCriticalDefects > 0 ? <AlertTriangleIcon className='size-3.5' /> : <CheckCircle2Icon className='size-3.5 text-green-500' />}
          <span>{summary.openCriticalDefects} open critical defects</span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm ${summary.openHighDefects > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
          {summary.openHighDefects > 0 ? <AlertTriangleIcon className='size-3.5' /> : <CheckCircle2Icon className='size-3.5 text-green-500' />}
          <span>{summary.openHighDefects} open high defects</span>
        </div>
      </div>

      {isBlocked && (
        <p className='text-xs text-destructive font-medium flex items-center gap-1'>
          <AlertTriangleIcon className='size-3' />
          V1 launch blocked — resolve open defects first
        </p>
      )}
    </div>
  )
}

function statusBadge(status: string) {
  if (status === 'ACTIVE') return <Badge variant='default'>Active</Badge>
  if (status === 'COMPLETED') return <Badge variant='secondary'>Completed</Badge>
  return <Badge variant='outline'>{status}</Badge>
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function QaDashboardPage() {
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getCampaigns()
      .then(result => {
        setCampaigns(Array.isArray(result) ? result : [])
      })
      .catch(() => setCampaigns([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className='h-full overflow-y-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-start justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-1'>
            <h1 className='text-2xl font-bold'>QA Companion</h1>
            <Badge variant='outline' className='text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800'>
              Phase 4
            </Badge>
          </div>
          <p className='text-sm text-muted-foreground'>Track V1 certification progress and manage test campaigns.</p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' size='sm' asChild>
            <Link to='/qa/tests'>
              <ClipboardListIcon className='size-4 mr-2' />
              All tests
            </Link>
          </Button>
          <Button variant='outline' size='sm' asChild>
            <Link to='/qa/environment'>
              <FlaskConicalIcon className='size-4 mr-2' />
              Environment
            </Link>
          </Button>
        </div>
      </div>

      {loading && (
        <div className='flex items-center gap-3 py-12 justify-center text-muted-foreground'>
          <div className='size-5 border-2 border-primary border-t-transparent rounded-full animate-spin' />
          Loading campaigns…
        </div>
      )}

      {/* V1 certification panel — shown once data loads */}
      {!loading && campaigns.length > 0 && <V1CertificationPanel campaigns={campaigns} />}

      {!loading && campaigns.length === 0 && (
        <Card>
          <CardContent className='py-12 text-center text-muted-foreground text-sm'>
            No campaigns found. Run <code className='text-xs bg-muted px-1 py-0.5 rounded'>pnpm db:seed</code> to create the V1 Certification campaign.
          </CardContent>
        </Card>
      )}

      {/* Campaign cards */}
      {campaigns.map(c => (
        <Card key={c.id}>
          <CardHeader className='pb-3'>
            <div className='flex items-start justify-between gap-4'>
              <div>
                <div className='flex items-center gap-2 mb-1'>
                  <CardTitle className='text-lg'>{c.name}</CardTitle>
                  {statusBadge(c.status)}
                  {c.targetBuild && (
                    <Badge variant='outline' className='font-mono text-xs'>
                      {c.targetBuild}
                    </Badge>
                  )}
                </div>
                {c.description && <CardDescription>{c.description}</CardDescription>}
              </div>
              <Button size='sm' asChild>
                <Link to='/qa/campaigns/$campaignId' params={{ campaignId: c.id }}>
                  <PlayIcon className='size-4 mr-2' />
                  Open
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <V1ReadinessBar summary={c} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
