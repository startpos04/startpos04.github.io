/**
 * /qa/tests/:testId/run — Test execution wizard
 *
 * Phases:
 *   CHECKING  — fixture validation (live DB checks)
 *   RUNNING   — step-by-step instructions
 *   RESULT    — outcome capture (pass / fail / blocked)
 *   DONE      — confirmation with defect ID if failed
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent } from '@platform/components/ui/card'
import { Checkbox } from '@platform/components/ui/checkbox'
import { Progress } from '@platform/components/ui/progress'
import { Separator } from '@platform/components/ui/separator'
import { Skeleton } from '@platform/components/ui/skeleton'
import { Textarea } from '@platform/components/ui/textarea'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
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
  XCircleIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FEATURE_LABELS, QA_ACCOUNT_PASSWORD, RISK_COLORS } from '@/lib/qa/constants'
import { validateTestFixtures } from '@/lib/qa/fixture-validator'
import { abandonRun, completeRun, startRun } from '@/lib/qa/test-runner'
import type { FixtureValidationResult, QaTestCase, QaTestStep } from '@/lib/qa/types'
import { ALL_TEST_CASES } from '../../../../../../../qa-definitions'

export const Route = createFileRoute('/(private)/(dashboard)/qa/tests/$testId/run')({
  component: RunWizardPage,
})

type WizardPhase = 'CHECKING' | 'RUNNING' | 'RESULT' | 'DONE'
type RunOutcome = 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'

// ---------------------------------------------------------------------------
// CopyButton
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
    <span className='inline-flex items-center gap-2'>
      {secret ? (
        <>
          <span className='font-mono text-sm tracking-widest'>{shown ? value : '••••••••••••'}</span>
          <Button type='button' variant='ghost' size='sm' className='h-6 px-2 text-xs' onClick={() => setShown(s => !s)}>
            {shown ? <EyeOffIcon className='size-3' /> : <EyeIcon className='size-3' />}
            {shown ? 'hide' : 'show'}
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
// Phase 1: Fixture check
// ---------------------------------------------------------------------------

function FixtureCheckScreen({ testCase, onReady, onCancel }: { testCase: QaTestCase; onReady: () => void; onCancel: () => void }) {
  const [result, setResult] = useState<FixtureValidationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    validateTestFixtures({ data: { testCase } })
      .then(r => setResult(r))
      .catch(err => setError(err instanceof Error ? err.message : 'Validation failed.'))
      .finally(() => setLoading(false))
  }, [testCase])

  const riskColors = RISK_COLORS[testCase.risk] ?? RISK_COLORS['LOW']!

  if (loading) {
    return (
      <div className='space-y-6'>
        <Skeleton className='h-16 w-full' />
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-10 w-full' />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className='border-destructive/30 bg-destructive/5'>
        <CardContent className='pt-4'>
          <div className='flex items-start gap-2 text-destructive text-sm'>
            <AlertTriangleIcon className='size-4 mt-0.5 shrink-0' />
            <p>{error}</p>
          </div>
          <Button variant='ghost' size='sm' className='mt-3' onClick={onCancel}>
            Go back
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  return (
    <div className='space-y-6'>
      {/* Test header */}
      <div>
        <div className='flex items-center gap-2 mb-1'>
          <span className='text-xs font-mono text-muted-foreground'>{testCase.id}</span>
          <Badge variant='outline' className={`${riskColors.bg} ${riskColors.text} ${riskColors.border}`}>
            {testCase.risk}
          </Badge>
        </div>
        <h1 className='text-lg font-bold'>{testCase.title}</h1>
        <p className='text-xs text-muted-foreground'>
          {FEATURE_LABELS[testCase.feature] ?? testCase.feature} · {testCase.workflow}
        </p>
      </div>

      {/* Checklist */}
      <Card>
        <CardContent className='pt-4 space-y-3'>
          <p className='text-sm font-semibold'>Before you start</p>
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
                  <Link
                    to='/qa/tests/$testId/run'
                    params={{ testId: check.prerequisiteTestId }}
                    className='text-xs text-primary hover:underline mt-1 inline-flex items-center gap-1'
                  >
                    <ArrowRightIcon className='size-3' />
                    Go to: {check.prerequisiteTestTitle ?? check.prerequisiteTestId}
                  </Link>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className='flex items-center gap-3'>
        <Button variant='outline' onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={!result.allSatisfied} onClick={onReady}>
          {result.allSatisfied ? 'Start Test' : 'Fix prerequisites first'}
          {result.allSatisfied && <ArrowRightIcon className='size-4 ml-2' />}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase 2: Step-by-step
// ---------------------------------------------------------------------------

function StepScreen({ testCase, stepIndex, onNext, onBack }: { testCase: QaTestCase; stepIndex: number; onNext: () => void; onBack: () => void }) {
  const step: QaTestStep = testCase.steps[stepIndex]!
  const total = testCase.steps.length
  const isLast = stepIndex === total - 1
  const [confirmed, setConfirmed] = useState(false)
  const progress = Math.round(((stepIndex + 1) / total) * 100)

  useEffect(() => setConfirmed(false), [stepIndex])

  return (
    <div className='space-y-6'>
      {/* Progress */}
      <div>
        <div className='flex justify-between text-xs text-muted-foreground mb-1.5'>
          <span>
            Step {stepIndex + 1} of {total}
          </span>
          <span className='font-mono'>{testCase.id}</span>
        </div>
        <Progress value={progress} className='h-1.5' />
      </div>

      {/* Instruction card */}
      <Card>
        <CardContent className='pt-5 space-y-4'>
          <p className='text-base font-medium leading-relaxed'>{step.instruction}</p>

          {step.hint && <p className='text-sm text-muted-foreground'>{step.hint}</p>}

          {step.copyable && (
            <div className='flex items-center gap-2 flex-wrap'>
              <span className='text-xs text-muted-foreground w-16 shrink-0'>{step.copyable.label}:</span>
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
            <label className='flex items-center gap-2 cursor-pointer select-none'>
              <Checkbox checked={confirmed} onCheckedChange={v => setConfirmed(v === true)} />
              <span className='text-sm'>I've done this</span>
            </label>
          )}
        </CardContent>
      </Card>

      {/* Nav */}
      <div className='flex items-center gap-3'>
        {stepIndex > 0 && (
          <Button variant='outline' onClick={onBack}>
            <ArrowLeftIcon className='size-4 mr-2' />
            Back
          </Button>
        )}
        <Button disabled={step.manualAction && !confirmed} onClick={onNext}>
          {isLast ? 'Record result' : "I've done this"}
          <ArrowRightIcon className='size-4 ml-2' />
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase 3: Result capture
// ---------------------------------------------------------------------------

function ResultScreen({
  testCase,
  onSubmit,
  submitting,
}: {
  testCase: QaTestCase
  onSubmit: (outcome: RunOutcome, note: string, screenshot?: string) => void
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

  const outcomeOptions: { value: RunOutcome; label: string; activeClass: string }[] = [
    { value: 'PASSED', label: '✓ Everything worked', activeClass: 'bg-green-600 text-white border-green-700' },
    { value: 'FAILED', label: '✗ Something went wrong', activeClass: 'bg-red-600 text-white border-red-700' },
    { value: 'BLOCKED', label: "? I couldn't complete it", activeClass: 'bg-orange-500 text-white border-orange-600' },
  ]

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-lg font-semibold'>Did everything behave normally?</h2>
        <p className='text-sm text-muted-foreground mt-1'>Review the expected outcomes below, then record your result.</p>
      </div>

      {/* Expected outcomes */}
      <Card>
        <CardContent className='pt-4 space-y-1.5'>
          <p className='text-xs font-semibold text-muted-foreground mb-2'>Expected</p>
          {testCase.expected.map((e, i) => (
            <div key={i} className='flex items-start gap-2 text-sm'>
              <CheckCircle2Icon className='size-3.5 text-green-500 mt-0.5 shrink-0' />
              <span>{e}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Outcome buttons */}
      <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
        {outcomeOptions.map(({ value, label, activeClass }) => (
          <button
            key={value}
            type='button'
            onClick={() => setChoice(value)}
            className={`px-4 py-3 rounded-lg border text-sm font-medium transition-colors ${choice === value ? activeClass : 'hover:bg-muted bg-background'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Note + screenshot — FAILED or BLOCKED */}
      {(choice === 'FAILED' || choice === 'BLOCKED') && (
        <div className='space-y-3'>
          <div>
            <label className='text-sm font-medium block mb-1.5'>Tell us what happened</label>
            <Textarea value={note} onChange={e => setNote(e.target.value)} rows={4} placeholder='Describe what you saw…' className='resize-none' />
          </div>
          <div>
            <input ref={fileRef} type='file' accept='image/*' className='hidden' onChange={handleFile} />
            {screenshot ? (
              <div className='space-y-2'>
                <img src={screenshot} alt='Screenshot' className='max-h-48 rounded border object-contain' />
                <Button
                  variant='ghost'
                  size='sm'
                  className='text-xs text-muted-foreground hover:text-destructive'
                  onClick={() => {
                    setScreenshot(undefined)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                >
                  Remove screenshot
                </Button>
              </div>
            ) : (
              <Button variant='outline' size='sm' onClick={() => fileRef.current?.click()}>
                + Add screenshot (optional)
              </Button>
            )}
          </div>
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
// Phase 4: Done
// ---------------------------------------------------------------------------

function DoneScreen({ testCase, outcome, defectId }: { testCase: QaTestCase; outcome: RunOutcome; defectId?: string }) {
  const icons: Record<RunOutcome, string> = {
    PASSED: '✅',
    FAILED: '❌',
    BLOCKED: '⚠️',
    SKIPPED: '–',
  }
  const messages: Record<RunOutcome, string> = {
    PASSED: 'Result recorded. Great work!',
    FAILED: 'Defect filed. A developer will investigate.',
    BLOCKED: 'Result recorded as Blocked.',
    SKIPPED: 'Test skipped.',
  }

  return (
    <div className='flex flex-col items-center justify-center py-16 gap-4 text-center'>
      <span className='text-5xl'>{icons[outcome]}</span>
      <div>
        <h2 className='text-xl font-bold'>{testCase.title}</h2>
        <p className='text-sm text-muted-foreground mt-1'>{messages[outcome]}</p>
        {defectId && (
          <p className='text-xs text-muted-foreground mt-1'>
            Defect ID: <code className='font-mono'>{defectId}</code>
          </p>
        )}
      </div>
      <Separator className='w-32' />
      <div className='flex gap-3'>
        <Button variant='outline' asChild>
          <Link to='/qa'>← Back to tests</Link>
        </Button>
        {outcome === 'PASSED' && (
          <Button asChild>
            <Link to='/qa/tests/$testId/run' params={{ testId: testCase.id }}>
              Run again
            </Link>
          </Button>
        )}
        {defectId && (
          <Button variant='outline' asChild>
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
// Root wizard
// ---------------------------------------------------------------------------

export default function RunWizardPage() {
  const { testId } = Route.useParams()
  const navigate = useNavigate()
  const tc: QaTestCase | undefined = ALL_TEST_CASES.find(t => t.id === testId)

  const [phase, setPhase] = useState<WizardPhase>('CHECKING')
  const [stepIndex, setStepIndex] = useState(0)
  const [runId, setRunId] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<RunOutcome | null>(null)
  const [defectId, setDefectId] = useState<string | undefined>()
  const [submitting, setSubmitting] = useState(false)

  // Track whether the run finished normally so the cleanup never abandons a completed run
  const runCompletedRef = useRef(false)

  useEffect(() => {
    runCompletedRef.current = false
  }, [runId])

  useEffect(() => {
    return () => {
      if (runId && !runCompletedRef.current) {
        abandonRun({ data: { runId } }).catch(() => {})
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId])

  const handleFixturesReady = useCallback(async () => {
    if (!tc) return
    try {
      const result = await startRun({ data: { testCase: tc } })
      setRunId(result.runId)
      setPhase('RUNNING')
      setStepIndex(0)
    } catch {
      /* stay on checking screen */
    }
  }, [tc])

  const handleStepNext = useCallback(() => {
    if (!tc) return
    if (stepIndex < tc.steps.length - 1) setStepIndex(s => s + 1)
    else setPhase('RESULT')
  }, [stepIndex, tc])

  const handleStepBack = useCallback(() => {
    setStepIndex(s => Math.max(0, s - 1))
  }, [])

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
      <div className='h-full overflow-y-auto p-6 max-w-2xl mx-auto'>
        <p className='text-sm text-destructive'>Test "{testId}" not found.</p>
        <Link to='/qa' className='text-sm text-primary hover:underline mt-2 block'>
          ← Back to test list
        </Link>
      </div>
    )
  }

  return (
    <div className='h-full overflow-y-auto p-6 max-w-2xl mx-auto'>
      {phase === 'CHECKING' && (
        <FixtureCheckScreen testCase={tc} onReady={handleFixturesReady} onCancel={() => navigate({ to: '/qa/tests/$testId', params: { testId: tc.id } })} />
      )}
      {phase === 'RUNNING' && <StepScreen testCase={tc} stepIndex={stepIndex} onNext={handleStepNext} onBack={handleStepBack} />}
      {phase === 'RESULT' && <ResultScreen testCase={tc} onSubmit={handleSubmitResult} submitting={submitting} />}
      {phase === 'DONE' && outcome && <DoneScreen testCase={tc} outcome={outcome} defectId={defectId} />}
    </div>
  )
}
