/**
 * /qa/defects/:defectId — Defect detail page
 *
 * Shows full defect context and allows status transitions.
 * Developer view adds source modules from the test definition.
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Separator } from '@platform/components/ui/separator'
import { Skeleton } from '@platform/components/ui/skeleton'
import { Textarea } from '@platform/components/ui/textarea'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronRightIcon, CodeIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { DefectDetail, DefectPriority, DefectStatus } from '@/lib/qa/defect-tracker'
import { allowedNextStatuses, getDefect, updateDefectStatus } from '@/lib/qa/defect-tracker'
import { ALL_TEST_CASES } from '../../../../../../../qa-definitions'

export const Route = createFileRoute('/(private)/(dashboard)/qa/defects/$defectId/')({
  component: DefectDetailPage,
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: 'Open',
  INVESTIGATING: 'Investigating',
  FIXED: 'Fixed',
  RETEST_REQUIRED: 'Retest Required',
  RETEST_FAILED: 'Retest Failed',
  RESOLVED: 'Resolved',
  WONT_FIX: "Won't Fix",
}

const STATUS_COLORS: Record<DefectStatus, string> = {
  OPEN: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  INVESTIGATING: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  FIXED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  RETEST_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  RETEST_FAILED: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  WONT_FIX: 'bg-muted text-muted-foreground border-border',
}

const PRIORITY_COLORS: Record<DefectPriority, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-blue-500 text-white',
}

const TRANSITION_BUTTON_LABELS: Record<DefectStatus, string> = {
  OPEN: 'Start Investigating',
  INVESTIGATING: 'Mark Fixed',
  FIXED: 'Require Retest',
  RETEST_REQUIRED: 'Mark Resolved',
  RETEST_FAILED: 'Re-investigate',
  RESOLVED: '',
  WONT_FIX: '',
}

// ---------------------------------------------------------------------------
// Status flow component
// ---------------------------------------------------------------------------

function StatusFlow({ current }: { current: DefectStatus }) {
  const steps: DefectStatus[] = ['OPEN', 'INVESTIGATING', 'FIXED', 'RETEST_REQUIRED', 'RESOLVED']
  const currentIdx = steps.indexOf(current)

  return (
    <div className='flex items-center gap-1 flex-wrap'>
      {steps.map((s, i) => {
        const isDone = currentIdx > i
        const isCurrent = currentIdx === i
        return (
          <div key={s} className='flex items-center gap-1'>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isCurrent ? 'bg-primary text-primary-foreground' : isDone ? 'bg-muted text-muted-foreground line-through' : 'text-muted-foreground'
              }`}
            >
              {STATUS_LABELS[s]}
            </span>
            {i < steps.length - 1 && <ChevronRightIcon className='size-3 text-muted-foreground shrink-0' />}
          </div>
        )
      })}
      {(current === 'WONT_FIX' || current === 'RETEST_FAILED') && (
        <Badge variant='outline' className={STATUS_COLORS[current]}>
          {STATUS_LABELS[current]}
        </Badge>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Status transition panel
// ---------------------------------------------------------------------------

function TransitionPanel({ defect, onUpdate }: { defect: DefectDetail; onUpdate: (newStatus: DefectStatus) => void }) {
  const [fixNote, setFixNote] = useState(defect.fixNote ?? '')
  const [buildFixed, setBuildFixed] = useState(defect.buildFixed ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const nextStatuses = allowedNextStatuses(defect.status)
  if (nextStatuses.length === 0) return null

  const primaryNext = nextStatuses[0]!
  const alternateNext = nextStatuses[1] // usually WONT_FIX

  const handleTransition = async (toStatus: DefectStatus) => {
    setSubmitting(true)
    setError(null)
    try {
      const result = await updateDefectStatus({
        data: {
          defectId: defect.id,
          newStatus: toStatus,
          ...(fixNote ? { fixNote } : {}),
          ...(buildFixed ? { buildFixed } : {}),
        },
      })
      if (result.ok) {
        onUpdate(toStatus)
      } else {
        setError(result.error ?? 'Transition failed.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader className='pb-3'>
        <CardTitle className='text-base'>Update Status</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {/* Fix note — shown when transitioning from INVESTIGATING → FIXED */}
        {defect.status === 'INVESTIGATING' && (
          <div className='space-y-1.5'>
            <label className='text-xs font-medium text-muted-foreground'>Fix note (optional)</label>
            <Textarea
              value={fixNote}
              onChange={e => setFixNote(e.target.value)}
              rows={3}
              placeholder='Describe what was fixed and how…'
              className='text-sm resize-none'
            />
            <input
              type='text'
              value={buildFixed}
              onChange={e => setBuildFixed(e.target.value)}
              placeholder='Build / commit ref (optional)'
              className='w-full text-sm rounded-md border bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary'
            />
          </div>
        )}

        {error && <p className='text-xs text-destructive'>{error}</p>}

        <div className='flex gap-2 flex-wrap'>
          <Button size='sm' onClick={() => handleTransition(primaryNext)} disabled={submitting}>
            {submitting ? 'Updating…' : TRANSITION_BUTTON_LABELS[defect.status] || STATUS_LABELS[primaryNext]}
          </Button>
          {alternateNext && (
            <Button variant='outline' size='sm' onClick={() => handleTransition(alternateNext)} disabled={submitting}>
              {STATUS_LABELS[alternateNext]}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Developer view
// ---------------------------------------------------------------------------

function DeveloperView({ defect }: { defect: DefectDetail }) {
  const tc = ALL_TEST_CASES.find(t => t.id === defect.testCaseId)

  return (
    <Card className='border-dashed'>
      <CardHeader className='pb-2'>
        <div className='flex items-center gap-2'>
          <CodeIcon className='size-4 text-muted-foreground' />
          <CardTitle className='text-sm text-muted-foreground font-medium'>Developer View</CardTitle>
        </div>
      </CardHeader>
      <CardContent className='space-y-3 text-xs font-mono'>
        <div>
          <p className='text-muted-foreground mb-1'>Defect ID</p>
          <p className='bg-muted px-2 py-1 rounded'>{defect.id}</p>
        </div>
        <div>
          <p className='text-muted-foreground mb-1'>Run ID</p>
          <p className='bg-muted px-2 py-1 rounded'>{defect.runId}</p>
        </div>
        {defect.run && (
          <div>
            <p className='text-muted-foreground mb-1'>Environment / Build</p>
            <p className='bg-muted px-2 py-1 rounded'>
              {defect.run.environment} · {defect.run.buildRef ?? 'no build ref'}
            </p>
          </div>
        )}
        {tc && (
          <>
            <div>
              <p className='text-muted-foreground mb-1'>Condition IDs required</p>
              <div className='bg-muted px-2 py-1 rounded space-y-0.5'>
                {tc.requires.map(c => (
                  <p key={c}>{c}</p>
                ))}
              </div>
            </div>
            {tc.sourceModules.length > 0 && (
              <div>
                <p className='text-muted-foreground mb-1'>Source modules</p>
                <div className='bg-muted px-2 py-1 rounded space-y-0.5'>
                  {tc.sourceModules.map(m => (
                    <p key={m} className='text-blue-600 dark:text-blue-400'>
                      {m}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DefectDetailPage() {
  const { defectId } = Route.useParams()
  const [defect, setDefect] = useState<DefectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [devView, setDevView] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    getDefect({ data: { defectId } })
      .then(setDefect)
      .catch(() => setDefect(null))
      .finally(() => setLoading(false))
  }, [defectId])

  useEffect(() => {
    load()
  }, [load])

  const handleStatusUpdate = useCallback(
    (newStatus: DefectStatus) => {
      // Optimistically update local state then reload for full consistency
      setDefect(d => (d ? { ...d, status: newStatus } : null))
      setTimeout(load, 500)
    },
    [load],
  )

  if (loading) {
    return (
      <div className='p-6 max-w-3xl mx-auto space-y-4'>
        <Skeleton className='h-8 w-64' />
        <Skeleton className='h-4 w-96' />
        <Skeleton className='h-32 w-full' />
      </div>
    )
  }

  if (!defect) {
    return (
      <div className='p-6 max-w-3xl mx-auto'>
        <p className='text-destructive text-sm'>Defect not found.</p>
        <Link to='/qa/defects' className='text-sm text-primary hover:underline mt-2 block'>
          ← Back to defects
        </Link>
      </div>
    )
  }

  const tc = ALL_TEST_CASES.find(t => t.id === defect.testCaseId)

  return (
    <div className='h-full overflow-y-auto p-6 max-w-3xl mx-auto space-y-6'>
      {/* Breadcrumb */}
      <div className='flex items-center gap-1.5 text-xs text-muted-foreground'>
        <Link to='/qa' className='hover:text-foreground'>
          QA
        </Link>
        <ChevronRightIcon className='size-3' />
        <Link to='/qa/defects' className='hover:text-foreground'>
          Defects
        </Link>
        <ChevronRightIcon className='size-3' />
        <span className='text-foreground font-mono'>{defect.id.slice(0, 8)}…</span>
      </div>

      {/* Header */}
      <div>
        <div className='flex items-center gap-2 flex-wrap mb-2'>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[defect.priority]}`}>{defect.priority}</span>
          <Badge variant='outline' className={STATUS_COLORS[defect.status]}>
            {STATUS_LABELS[defect.status]}
          </Badge>
          <span className='text-xs font-mono text-muted-foreground'>{defect.testCaseId}</span>
        </div>
        <h1 className='text-xl font-bold'>{defect.title}</h1>
        <p className='text-sm text-muted-foreground mt-1'>
          Filed by {defect.testerName ?? '—'} · {new Date(defect.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Status flow */}
      <StatusFlow current={defect.status} />

      <Separator />

      {/* Description */}
      <div>
        <h2 className='text-sm font-semibold mb-2'>What the tester observed</h2>
        <p className='text-sm text-foreground whitespace-pre-wrap rounded-lg border bg-muted/30 px-4 py-3'>{defect.description}</p>
      </div>

      {/* Fix note — shown once set */}
      {defect.fixNote && (
        <div>
          <h2 className='text-sm font-semibold mb-2'>Fix note</h2>
          <p className='text-sm text-foreground whitespace-pre-wrap rounded-lg border bg-blue-50/50 dark:bg-blue-950/20 px-4 py-3'>{defect.fixNote}</p>
          {defect.buildFixed && <p className='text-xs text-muted-foreground mt-1 font-mono'>Fixed in: {defect.buildFixed}</p>}
        </div>
      )}

      {/* Run context */}
      {defect.run && (
        <div>
          <h2 className='text-sm font-semibold mb-2'>Run context</h2>
          <div className='rounded-lg border px-4 py-3 text-sm space-y-1'>
            <div className='flex gap-2'>
              <span className='text-muted-foreground w-24 shrink-0'>Tester</span>
              <span>{defect.run.testerName}</span>
            </div>
            <div className='flex gap-2'>
              <span className='text-muted-foreground w-24 shrink-0'>Environment</span>
              <span className='font-mono'>{defect.run.environment}</span>
            </div>
            {defect.run.buildRef && (
              <div className='flex gap-2'>
                <span className='text-muted-foreground w-24 shrink-0'>Build</span>
                <span className='font-mono'>{defect.run.buildRef}</span>
              </div>
            )}
            <div className='flex gap-2'>
              <span className='text-muted-foreground w-24 shrink-0'>Run at</span>
              <span>{new Date(defect.run.startedAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Linked test */}
      {tc && (
        <div className='flex items-center justify-between rounded-lg border px-4 py-3'>
          <div>
            <p className='text-xs text-muted-foreground mb-0.5'>Linked test</p>
            <p className='text-sm font-medium'>
              {tc.id} — {tc.title}
            </p>
          </div>
          <Button variant='outline' size='sm' asChild>
            <Link to='/qa/tests/$testId/run' params={{ testId: tc.id }}>
              Re-run test
            </Link>
          </Button>
        </div>
      )}

      {/* Transition panel */}
      <TransitionPanel defect={defect} onUpdate={handleStatusUpdate} />

      {/* Developer view toggle */}
      <div>
        <button
          type='button'
          onClick={() => setDevView(v => !v)}
          className='flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors'
        >
          <CodeIcon className='size-3.5' />
          {devView ? 'Hide developer view' : 'Show developer view'}
        </button>
      </div>

      {devView && <DeveloperView defect={defect} />}
    </div>
  )
}
