/**
 * DefectDetailAside
 *
 * Aside content for a QA defect.
 * Header: priority badge, status badge, title, test ID.
 * Body:   tester observation, fix note, run context, linked test.
 * Footer: status transition buttons (SUPERADMIN / developer).
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Separator } from '@platform/components/ui/separator'
import { Textarea } from '@platform/components/ui/textarea'
import type { MountProps } from '@platform/lib/mount-manager'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  Loader2Icon,
  RotateCcwIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ALL_TEST_CASES } from '../../../../../../../qa-definitions'
import { getDefect, updateDefectStatus } from '@/lib/qa/defect-tracker'
import type { DefectDetail, DefectPriority, DefectStatus } from '@/lib/qa/defect-tracker'
import { allowedNextStatuses } from '@/lib/qa/defect-tracker'

interface DefectDetailAsideProps extends MountProps {
  defectId: string
  onStatusChange?: () => void
}

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

const TRANSITION_LABELS: Partial<Record<DefectStatus, string>> = {
  OPEN: 'Start Investigating',
  INVESTIGATING: 'Mark Fixed',
  FIXED: 'Require Retest',
  RETEST_REQUIRED: 'Mark Resolved',
  RETEST_FAILED: 'Re-investigate',
}

// ---------------------------------------------------------------------------
// Status flow strip
// ---------------------------------------------------------------------------

function StatusFlow({ current }: { current: DefectStatus }) {
  const steps: DefectStatus[] = ['OPEN', 'INVESTIGATING', 'FIXED', 'RETEST_REQUIRED', 'RESOLVED']
  const idx = steps.indexOf(current)
  return (
    <div className='flex items-center gap-1 flex-wrap'>
      {steps.map((s, i) => (
        <div key={s} className='flex items-center gap-1'>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            i === idx ? 'bg-primary text-primary-foreground' :
            i < idx ? 'text-muted-foreground line-through' : 'text-muted-foreground'
          }`}>
            {STATUS_LABELS[s]}
          </span>
          {i < steps.length - 1 && <ChevronRightIcon className='size-3 text-muted-foreground shrink-0' />}
        </div>
      ))}
      {(current === 'WONT_FIX' || current === 'RETEST_FAILED') && (
        <Badge variant='outline' className={`text-xs ${STATUS_COLORS[current]}`}>
          {STATUS_LABELS[current]}
        </Badge>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function DefectDetailAside({ defectId, onClose, onStatusChange }: DefectDetailAsideProps) {
  const [defect, setDefect] = useState<DefectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [fixNote, setFixNote] = useState('')
  const [buildFixed, setBuildFixed] = useState('')
  const [transitioning, setTransitioning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    getDefect({ data: { defectId } })
      .then(d => {
        setDefect(d)
        setFixNote(d?.fixNote ?? '')
        setBuildFixed(d?.buildFixed ?? '')
      })
      .catch(() => setDefect(null))
      .finally(() => setLoading(false))
  }, [defectId])

  useEffect(() => { load() }, [load])

  const handleTransition = async (toStatus: DefectStatus) => {
    setTransitioning(true)
    setError(null)
    try {
      const result = await updateDefectStatus({
        data: {
          defectId,
          newStatus: toStatus,
          ...(fixNote ? { fixNote } : {}),
          ...(buildFixed ? { buildFixed } : {}),
        },
      })
      if (result.ok) {
        load()
        onStatusChange?.()
      } else {
        setError(result.error ?? 'Transition failed.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error.')
    } finally {
      setTransitioning(false)
    }
  }

  const tc = defect ? ALL_TEST_CASES.find(t => t.id === defect.testCaseId) : undefined
  const nextStatuses = defect ? allowedNextStatuses(defect.status) : []
  const primaryNext = nextStatuses[0]
  const alternateNext = nextStatuses[1]

  return (
    <div className='flex flex-col h-full'>

      {/* ── Header ─────────────────────────────────────── */}
      <div className='flex items-start justify-between p-4 border-b shrink-0'>
        <div className='flex-1 min-w-0 pr-3'>
          {loading ? (
            <div className='space-y-2'>
              <div className='h-4 bg-muted rounded animate-pulse w-32' />
              <div className='h-5 bg-muted rounded animate-pulse w-48' />
            </div>
          ) : defect ? (
            <>
              <div className='flex items-center gap-2 flex-wrap mb-1'>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[defect.priority]}`}>
                  {defect.priority}
                </span>
                <Badge variant='outline' className={`text-xs ${STATUS_COLORS[defect.status]}`}>
                  {STATUS_LABELS[defect.status]}
                </Badge>
                <span className='text-xs font-mono text-muted-foreground'>{defect.testCaseId}</span>
              </div>
              <h2 className='text-sm font-semibold leading-tight'>{defect.title}</h2>
              <p className='text-xs text-muted-foreground mt-0.5'>
                Filed by {defect.testerName ?? '—'} · {new Date(defect.createdAt).toLocaleDateString()}
              </p>
            </>
          ) : (
            <p className='text-sm text-muted-foreground'>Defect not found</p>
          )}
        </div>
        <Button variant='ghost' size='icon' className='h-7 w-7 shrink-0' onClick={onClose}>
          <XIcon className='size-4' />
        </Button>
      </div>

      {/* ── Scrollable body ───────────────────────────── */}
      <div className='flex-1 overflow-y-auto p-4 space-y-5'>
        {!loading && defect && (
          <>
            {/* Status flow */}
            <StatusFlow current={defect.status} />

            <Separator />

            {/* Observation */}
            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                What the tester observed
              </p>
              <p className='text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg px-3 py-2.5 border'>
                {defect.description}
              </p>
            </div>

            {/* Fix note */}
            {defect.fixNote && (
              <div>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                  Fix note
                </p>
                <p className='text-sm text-foreground whitespace-pre-wrap bg-blue-50/50 dark:bg-blue-950/20 rounded-lg px-3 py-2.5 border border-blue-100 dark:border-blue-900'>
                  {defect.fixNote}
                </p>
                {defect.buildFixed && (
                  <p className='text-xs text-muted-foreground mt-1 font-mono'>Fixed in: {defect.buildFixed}</p>
                )}
              </div>
            )}

            {/* Run context */}
            {defect.run && (
              <div>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>
                  Run context
                </p>
                <div className='rounded-lg border px-3 py-2.5 space-y-1.5 text-sm'>
                  <div className='flex gap-2'>
                    <span className='text-muted-foreground w-20 shrink-0 text-xs'>Tester</span>
                    <span className='text-xs'>{defect.run.testerName}</span>
                  </div>
                  <div className='flex gap-2'>
                    <span className='text-muted-foreground w-20 shrink-0 text-xs'>Environment</span>
                    <span className='text-xs font-mono'>{defect.run.environment}</span>
                  </div>
                  {defect.run.buildRef && (
                    <div className='flex gap-2'>
                      <span className='text-muted-foreground w-20 shrink-0 text-xs'>Build</span>
                      <span className='text-xs font-mono'>{defect.run.buildRef}</span>
                    </div>
                  )}
                  <div className='flex gap-2'>
                    <span className='text-muted-foreground w-20 shrink-0 text-xs'>Run at</span>
                    <span className='text-xs'>{new Date(defect.run.startedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Linked test */}
            {tc && (
              <div className='flex items-center justify-between rounded-lg border px-3 py-2.5'>
                <div>
                  <p className='text-xs text-muted-foreground'>Linked test</p>
                  <p className='text-sm font-medium'>{tc.id} — {tc.title}</p>
                </div>
                <Button variant='outline' size='sm' asChild>
                  <Link to='/qa/tests/$testId/run' params={{ testId: tc.id }} onClick={onClose}>
                    Re-run
                    <ArrowRightIcon className='size-3.5 ml-1.5' />
                  </Link>
                </Button>
              </div>
            )}

            {/* Fix note input — shown when INVESTIGATING */}
            {defect.status === 'INVESTIGATING' && (
              <div className='space-y-2'>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                  Fix details (optional)
                </p>
                <Textarea
                  value={fixNote}
                  onChange={e => setFixNote(e.target.value)}
                  rows={3}
                  placeholder='Describe what was fixed…'
                  className='resize-none text-sm'
                />
                <Input
                  value={buildFixed}
                  onChange={e => setBuildFixed(e.target.value)}
                  placeholder='Build / commit ref (optional)'
                  className='text-sm font-mono'
                />
              </div>
            )}

            {error && (
              <div className='flex gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg'>
                <AlertTriangleIcon className='size-3.5 mt-0.5 shrink-0' />
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer — transition buttons ────────────────── */}
      {!loading && defect && nextStatuses.length > 0 && (
        <div className='p-4 border-t shrink-0 space-y-2'>
          {primaryNext && (
            <Button
              className='w-full gap-2'
              disabled={transitioning}
              onClick={() => handleTransition(primaryNext)}
            >
              {transitioning && <Loader2Icon className='size-4 animate-spin' />}
              {TRANSITION_LABELS[defect.status] ?? STATUS_LABELS[primaryNext]}
            </Button>
          )}
          {alternateNext && (
            <Button
              variant='outline'
              size='sm'
              className='w-full'
              disabled={transitioning}
              onClick={() => handleTransition(alternateNext)}
            >
              {alternateNext === 'WONT_FIX' && <RotateCcwIcon className='size-3.5 mr-1.5' />}
              {STATUS_LABELS[alternateNext]}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
