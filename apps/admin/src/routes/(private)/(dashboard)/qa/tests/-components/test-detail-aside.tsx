/**
 * TestDetailAside
 *
 * Aside content for QA test detail + inline run wizard.
 * 'detail' view → shows test metadata + "Run Test" button.
 * 'run' view    → shows the wizard inline (checking → running → result → done).
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Checkbox } from '@platform/components/ui/checkbox'
import { Progress } from '@platform/components/ui/progress'
import { Textarea } from '@platform/components/ui/textarea'
import type { MountProps } from '@platform/lib/mount-manager'
import { Link } from '@tanstack/react-router'
import {
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  CopyIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  PlayIcon,
  RotateCcwIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FEATURE_LABELS, QA_ACCOUNT_PASSWORD, RISK_COLORS } from '@/lib/qa/constants'
import { validateTestFixtures } from '@/lib/qa/fixture-validator'
import { abandonRun, completeRun, startRun } from '@/lib/qa/test-runner'
import type { FixtureValidationResult, QaTestCase, QaTestStep } from '@/lib/qa/types'
import { ALL_TEST_CASES } from '../../../../../../../qa-definitions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestDetailAsideProps extends MountProps {
  testId: string
  disabledReason?: string
}

type WizardPhase = 'CHECKING' | 'RUNNING' | 'RESULT' | 'DONE'
type RunOutcome = 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'
type View = 'detail' | 'run'

// ---------------------------------------------------------------------------
// CopyButton (inline — same as run.tsx)
// ---------------------------------------------------------------------------

function CopyButton({ value, secret }: { value: string; secret?: boolean }) {
  const [copied, setCopied] = useState(false)
  const [shown, setShown] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <span className='inline-flex items-center gap-2 flex-wrap'>
      {secret ? (
        <>
          <span className='font-mono text-sm tracking-widest'>{shown ? value : '••••••••••••'}</span>
          <Button type='button' variant='ghost' size='sm' className='h-6 px-2 text-xs' onClick={() => setShown(s => !s)}>
            {shown ? <EyeOffIcon className='size-3' /> : <EyeIcon className='size-3' />}
          </Button>
        </>
      ) : (
        <code className='font-mono text-sm bg-muted px-2 py-0.5 rounded'>{value}</code>
      )}
      <Button type='button' variant='ghost' size='sm' className='h-6 px-2 text-xs' onClick={handleCopy}>
        <CopyIcon className='size-3 mr-1' />
        {copied ? 'Copied!' : 'Copy'}
      </Button>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Fixture check phase
// ---------------------------------------------------------------------------

function FixtureCheckView({ tc, onReady, onCancel }: { tc: QaTestCase; onReady: () => void; onCancel: () => void }) {
  const [result, setResult] = useState<FixtureValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    validateTestFixtures({ data: { testCase: tc } })
      .then(setResult)
      .catch(err => setError(err instanceof Error ? err.message : 'Validation failed.'))
      .finally(() => setLoading(false))
  }, [tc])

  if (loading)
    return (
      <div className='flex flex-col items-center justify-center py-12 gap-3'>
        <Loader2Icon className='size-5 animate-spin text-muted-foreground' />
        <p className='text-xs text-muted-foreground'>Checking prerequisites…</p>
      </div>
    )

  if (error)
    return (
      <div className='p-4 rounded-lg bg-destructive/10 text-destructive text-sm'>
        {error}
        <Button variant='ghost' size='sm' className='mt-2 block' onClick={onCancel}>
          Go back
        </Button>
      </div>
    )

  if (!result) return null

  return (
    <div className='space-y-4'>
      <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Before you start</p>
      {result.checks.map(check => (
        <div key={check.conditionId} className='flex items-start gap-3'>
          {check.satisfied ? (
            <CheckCircle2Icon className='size-4 text-green-500 mt-0.5 shrink-0' />
          ) : (
            <XCircleIcon className='size-4 text-destructive mt-0.5 shrink-0' />
          )}
          <div className='flex-1'>
            <p className={`text-sm ${check.satisfied ? 'text-foreground' : 'text-muted-foreground'}`}>{check.label}</p>
            {!check.satisfied && check.detail && <p className='text-xs text-muted-foreground mt-0.5'>{check.detail}</p>}
            {!check.satisfied && check.prerequisiteTestId && (
              <p className='text-xs text-muted-foreground mt-0.5'>
                Requires: <span className='font-mono'>{check.prerequisiteTestId}</span>
              </p>
            )}
          </div>
        </div>
      ))}
      <div className='flex gap-2 pt-2'>
        <Button variant='outline' size='sm' onClick={onCancel}>
          Cancel
        </Button>
        <Button size='sm' disabled={!result.allSatisfied} onClick={onReady}>
          {result.allSatisfied ? 'Start Test' : 'Fix prerequisites first'}
          {result.allSatisfied && <ArrowRightIcon className='size-3.5 ml-1' />}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Step phase
// ---------------------------------------------------------------------------

function StepView({ tc, stepIndex, onNext, onBack }: { tc: QaTestCase; stepIndex: number; onNext: () => void; onBack: () => void }) {
  const step: QaTestStep = tc.steps[stepIndex]!
  const total = tc.steps.length
  const isLast = stepIndex === total - 1
  const [confirmed, setConfirmed] = useState(false)
  const progress = Math.round(((stepIndex + 1) / total) * 100)
  useEffect(() => setConfirmed(false), [stepIndex])

  return (
    <div className='space-y-4'>
      <div>
        <div className='flex justify-between text-xs text-muted-foreground mb-1.5'>
          <span>
            Step {stepIndex + 1} of {total}
          </span>
          <span className='font-mono'>{tc.id}</span>
        </div>
        <Progress value={progress} className='h-1.5' />
      </div>

      <div className='rounded-lg border bg-muted/20 p-4 space-y-3'>
        <p className='text-sm font-medium leading-relaxed'>{step.instruction}</p>
        {step.hint && <p className='text-xs text-muted-foreground'>{step.hint}</p>}
        {step.copyable && (
          <div className='flex items-center gap-2 flex-wrap'>
            <span className='text-xs text-muted-foreground shrink-0'>{step.copyable.label}:</span>
            <CopyButton value={step.copyable.value === '123qwe123!1' ? QA_ACCOUNT_PASSWORD : step.copyable.value} secret={step.copyable.secret} />
          </div>
        )}
        {step.openUrl && (
          <Button variant='outline' size='sm' asChild>
            <a href={step.openUrl} target='_blank' rel='noopener noreferrer'>
              <ExternalLinkIcon className='size-3.5 mr-1.5' />
              Open {step.openUrl}
            </a>
          </Button>
        )}
        {step.manualAction && (
          <label className='flex items-center gap-2 cursor-pointer'>
            <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} />
            <span className='text-sm'>I've done this</span>
          </label>
        )}
      </div>

      <div className='flex gap-2'>
        {stepIndex > 0 && (
          <Button variant='outline' size='sm' onClick={onBack}>
            <ArrowLeftIcon className='size-3.5 mr-1' />
            Back
          </Button>
        )}
        <Button size='sm' disabled={step.manualAction && !confirmed} onClick={onNext}>
          {isLast ? 'Record result' : "I've done this"}
          <ArrowRightIcon className='size-3.5 ml-1' />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Result phase
// ---------------------------------------------------------------------------

function ResultView({
  tc,
  onSubmit,
  submitting,
}: {
  tc: QaTestCase
  onSubmit: (o: RunOutcome, note: string, screenshot?: string) => void
  submitting: boolean
}) {
  const [choice, setChoice] = useState<RunOutcome | null>(null)
  const [note, setNote] = useState('')
  const [screenshot, setScreenshot] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setScreenshot(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const opts: { value: RunOutcome; label: string; active: string }[] = [
    { value: 'PASSED', label: '✓ Everything worked', active: 'bg-green-600 text-white border-green-700' },
    { value: 'FAILED', label: '✗ Something went wrong', active: 'bg-red-600 text-white border-red-700' },
    { value: 'BLOCKED', label: "? Couldn't complete", active: 'bg-orange-500 text-white border-orange-600' },
  ]

  return (
    <div className='space-y-4'>
      <div>
        <p className='text-sm font-semibold mb-1'>Did everything behave normally?</p>
        <div className='rounded-lg border bg-muted/20 p-3 space-y-1.5 mb-3'>
          <p className='text-xs font-semibold text-muted-foreground mb-1'>Expected</p>
          {tc.expected.map((e, i) => (
            <div key={i} className='flex items-start gap-2 text-xs'>
              <CheckCircle2Icon className='size-3 text-green-500 mt-0.5 shrink-0' />
              {e}
            </div>
          ))}
        </div>
      </div>

      <div className='grid gap-2'>
        {opts.map(({ value, label, active }) => (
          <button
            key={value}
            type='button'
            onClick={() => setChoice(value)}
            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors text-left ${choice === value ? active : 'hover:bg-muted bg-background'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(choice === 'FAILED' || choice === 'BLOCKED') && (
        <div className='space-y-2'>
          <label className='text-xs font-medium'>What happened</label>
          <Textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder='Describe what you saw…' className='resize-none text-sm' />
          <input ref={fileRef} type='file' accept='image/*' className='hidden' onChange={handleFile} />
          {screenshot ? (
            <div className='space-y-1'>
              <img src={screenshot} alt='Screenshot' className='max-h-32 rounded border object-contain' />
              <Button
                variant='ghost'
                size='sm'
                className='text-xs'
                onClick={() => {
                  setScreenshot(undefined)
                  if (fileRef.current) fileRef.current.value = ''
                }}
              >
                Remove
              </Button>
            </div>
          ) : (
            <Button variant='outline' size='sm' onClick={() => fileRef.current?.click()}>
              + Add screenshot
            </Button>
          )}
        </div>
      )}

      <Button disabled={!choice || submitting} onClick={() => choice && onSubmit(choice, note, screenshot)}>
        {submitting && <Loader2Icon className='size-4 mr-2 animate-spin' />}
        {submitting ? 'Saving…' : 'Submit Result'}
      </Button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Done phase
// ---------------------------------------------------------------------------

function DoneView({
  tc,
  outcome,
  defectId,
  onRunAgain,
  onClose,
}: {
  tc: QaTestCase
  outcome: RunOutcome
  defectId?: string
  onRunAgain: () => void
  onClose: () => void
}) {
  const icons: Record<RunOutcome, string> = { PASSED: '✅', FAILED: '❌', BLOCKED: '⚠️', SKIPPED: '–' }
  const messages: Record<RunOutcome, string> = {
    PASSED: 'Result recorded. Great work!',
    FAILED: 'Defect filed. A developer will investigate.',
    BLOCKED: 'Result recorded as Blocked.',
    SKIPPED: 'Test skipped.',
  }
  return (
    <div className='flex flex-col items-center justify-center py-10 gap-4 text-center'>
      <span className='text-4xl'>{icons[outcome]}</span>
      <div>
        <p className='font-semibold'>{tc.title}</p>
        <p className='text-sm text-muted-foreground mt-1'>{messages[outcome]}</p>
        {defectId && <p className='text-xs text-muted-foreground mt-1 font-mono'>Defect: {defectId}</p>}
      </div>
      <div className='flex gap-2 flex-wrap justify-center'>
        <Button variant='outline' size='sm' onClick={onClose}>
          Close
        </Button>
        <Button size='sm' onClick={onRunAgain}>
          <RotateCcwIcon className='size-3.5 mr-1.5' />
          Run again
        </Button>
        {defectId && (
          <Button variant='outline' size='sm' asChild onClick={onClose}>
            <Link to='/qa/defects/$defectId' params={{ defectId }}>
              View defect
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main aside component
// ---------------------------------------------------------------------------

export function TestDetailAside({ testId, onClose, disabledReason }: TestDetailAsideProps) {
  const tc: QaTestCase | undefined = ALL_TEST_CASES.find(t => t.id === testId)

  const [view, setView] = useState<View>('detail')
  const [phase, setPhase] = useState<WizardPhase>('CHECKING')
  const [stepIndex, setStepIndex] = useState(0)
  const [runId, setRunId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [defectId, setDefectId] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  const runCompletedRef = useRef(false)

  // Abandon run on unmount/close if not completed
  useEffect(() => {
    runCompletedRef.current = false
  }, [runId])

  useEffect(() => {
    return () => {
      if (runId && !runCompletedRef.current) {
        abandonRun({ data: { runId } }).catch(() => {})
      }
    }
  }, [runId])

  const startWizard = () => {
    setView('run')
    setPhase('CHECKING')
    setStepIndex(0)
    setRunId(null)
    setOutcome(null)
    setDefectId(undefined)
    runCompletedRef.current = false
  }

  const handleFixturesReady = useCallback(async () => {
    if (!tc) return
    try {
      const result = await startRun({ data: { testCase: tc } })
      setRunId(result.runId)
      setPhase('RUNNING')
      setStepIndex(0)
    } catch {
      /* stay on checking */
    }
  }, [tc])

  const handleStepNext = useCallback(() => {
    if (!tc) return
    if (stepIndex < tc.steps.length - 1) setStepIndex(s => s + 1)
    else setPhase('RESULT')
  }, [stepIndex, tc])

  const handleSubmitResult = useCallback(
    async (o: RunOutcome, note: string, screenshot?: string) => {
      if (!tc || !runId) return
      setSubmitting(true)
      try {
        const result = await completeRun({ data: { runId, testCase: tc, outcome: o, testerNote: note, screenshot } })
        runCompletedRef.current = true
        setOutcome(o)
        setDefectId(result.defectId)
        setPhase('DONE')
      } finally {
        setSubmitting(false)
      }
    },
    [tc, runId],
  )

  if (!tc) {
    return (
      <div className='flex flex-col h-full'>
        <div className='flex items-center justify-between p-4 border-b shrink-0'>
          <p className='text-sm text-muted-foreground'>Test not found</p>
          <Button variant='ghost' size='icon' className='h-7 w-7' onClick={onClose}>
            <XIcon className='size-4' />
          </Button>
        </div>
      </div>
    )
  }

  const riskColors = RISK_COLORS[tc.risk] ?? RISK_COLORS['LOW']!
  const isRunView = view === 'run'

  const phaseTitle: Record<WizardPhase, string> = {
    CHECKING: 'Prerequisites',
    RUNNING: `Step ${stepIndex + 1} of ${tc.steps.length}`,
    RESULT: 'Record result',
    DONE: 'Done',
  }

  return (
    <div className='flex flex-col h-full'>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className='flex items-start justify-between p-4 border-b shrink-0'>
        <div className='flex-1 min-w-0 pr-3'>
          <div className='flex items-center gap-2 flex-wrap mb-1'>
            {isRunView && (
              <Button variant='ghost' size='sm' className='h-6 px-2 text-xs -ml-1' onClick={() => setView('detail')}>
                <ArrowLeftIcon className='size-3 mr-1' />
                Back
              </Button>
            )}
            <span className='text-xs font-mono text-muted-foreground'>{tc.id}</span>
            <Badge variant='outline' className={`text-[10px] font-semibold ${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
              {tc.risk}
            </Badge>
          </div>
          <h2 className='text-sm font-semibold leading-tight'>{tc.title}</h2>
          {isRunView && <p className='text-xs text-muted-foreground mt-0.5'>{phaseTitle[phase]}</p>}
        </div>
        <Button variant='ghost' size='icon' className='h-7 w-7 shrink-0' onClick={onClose}>
          <XIcon className='size-4' />
        </Button>
      </div>

      {/* ── Scrollable body ────────────────────────────────── */}
      <div className='flex-1 overflow-y-auto p-4'>
        {/* DETAIL VIEW */}
        {view === 'detail' && (
          <div className='space-y-5'>
            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>What this verifies</p>
              <div className='space-y-1.5'>
                {tc.expected.map((e, i) => (
                  <div key={i} className='flex items-start gap-2 text-sm'>
                    <CheckCircle2Icon className='size-3.5 text-green-500 mt-0.5 shrink-0' />
                    {e}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>{tc.steps.length} steps</p>
              <ol className='space-y-2'>
                {tc.steps.map((s, i) => (
                  <li key={i} className='flex gap-3 text-sm'>
                    <span className='font-mono text-xs text-muted-foreground/60 w-5 shrink-0 mt-0.5 text-right'>{i + 1}.</span>
                    <span className='text-muted-foreground leading-snug'>{s.instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
            {tc.requires.length > 0 && (
              <div>
                <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2'>Prerequisites</p>
                {tc.requires.map(c => (
                  <p key={c} className='text-xs font-mono bg-muted px-2 py-1 rounded text-muted-foreground mb-1'>
                    {c}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RUN VIEW */}
        {view === 'run' && (
          <>
            {phase === 'CHECKING' && <FixtureCheckView tc={tc} onReady={handleFixturesReady} onCancel={() => setView('detail')} />}
            {phase === 'RUNNING' && <StepView tc={tc} stepIndex={stepIndex} onNext={handleStepNext} onBack={() => setStepIndex(s => Math.max(0, s - 1))} />}
            {phase === 'RESULT' && <ResultView tc={tc} onSubmit={handleSubmitResult} submitting={submitting} />}
            {phase === 'DONE' && outcome && <DoneView tc={tc} outcome={outcome} defectId={defectId} onRunAgain={startWizard} onClose={onClose} />}
          </>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────── */}
      {view === 'detail' && (
        <div className='p-4 border-t shrink-0'>
          {disabledReason ? (
            <div className='flex flex-col gap-2'>
              <Button className='w-full gap-2' disabled>
                <PlayIcon className='size-4' />
                Run Test
              </Button>
              <p className='text-xs text-center text-muted-foreground'>{disabledReason}</p>
            </div>
          ) : (
            <Button className='w-full gap-2' onClick={startWizard}>
              <PlayIcon className='size-4' />
              Run Test
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
