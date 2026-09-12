/**
 * /qa/tests — Full test catalogue
 *
 * Full-width layout. Clicking a row opens the test detail in an Aside drawer
 * via MountManager — same pattern as the products page in apps/web.
 *
 * SUPERADMIN additions:
 *  - Checkbox on each row to select tests
 *  - "Select all / Deselect all" toggle per feature group
 *  - Assign toolbar at the top: tester picker + "Assign selected" button
 *  - Assignee label badge on each row showing who the test is assigned to
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Checkbox } from '@platform/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Separator } from '@platform/components/ui/separator'
import { Textarea } from '@platform/components/ui/textarea'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import { AlertTriangleIcon, CheckCircle2Icon, ChevronRightIcon, CircleDashedIcon, SearchIcon, UserIcon, XCircleIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import type { RegressionImpactResult } from '@/lib/qa/campaign-service'
import { getRegressionImpact } from '@/lib/qa/campaign-service'
import { FEATURE_LABELS, OUTCOME_COLORS, RISK_COLORS } from '@/lib/qa/constants'
import { assignTests, getAssignments, getRecentRuns, getTesters } from '@/lib/qa/test-runner'
import type { QaTestCase } from '@/lib/qa/types'
import { ALL_TEST_CASES } from '../../../../../../qa-definitions'
import { closeTestAside, showTestAside, TEST_ASIDE_ID } from './-components/test-aside'
import { TestDetailAside } from './-components/test-detail-aside'

export const Route = createFileRoute('/(private)/(dashboard)/qa/tests/')({
  component: QaTestsPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RecentRun {
  testCaseId: string
  outcome: string | null
  testerName: string
  completedAt: string | null
}

interface Assignment {
  id: string
  testCaseId: string
  assigneeId: string
  assigneeName: string
  assigneeEmail: string
  assignedById: string
  assignedAt: string
}

interface Tester {
  id: string
  name: string
  email: string
  role: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByFeature(tests: QaTestCase[]) {
  const groups: Record<string, QaTestCase[]> = {}
  for (const t of tests) {
    if (!groups[t.feature]) groups[t.feature] = []
    groups[t.feature]!.push(t)
  }
  return groups
}

function RiskBadge({ risk }: { risk: string }) {
  const c = RISK_COLORS[risk] ?? RISK_COLORS['LOW']!
  return <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>{risk}</span>
}

function OutcomeBadge({ outcome }: { outcome: string | null }) {
  if (!outcome) return <span className='inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground'>Not run</span>
  const c = OUTCOME_COLORS[outcome] ?? { bg: 'bg-muted', text: 'text-muted-foreground' }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.bg} ${c.text}`}>
      {outcome.charAt(0) + outcome.slice(1).toLowerCase()}
    </span>
  )
}

function OutcomeIcon({ outcome }: { outcome: string | null }) {
  if (outcome === 'PASSED') return <CheckCircle2Icon className='size-4 text-green-500 shrink-0' />
  if (outcome === 'FAILED') return <XCircleIcon className='size-4 text-destructive shrink-0' />
  if (outcome === 'BLOCKED') return <AlertTriangleIcon className='size-4 text-amber-500 shrink-0' />
  return <CircleDashedIcon className='size-4 text-muted-foreground shrink-0' />
}

function AssigneeBadge({ name }: { name: string }) {
  return (
    <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800 shrink-0 max-w-[120px]'>
      <UserIcon className='size-3 shrink-0' />
      <span className='truncate'>{name}</span>
    </span>
  )
}

// ---------------------------------------------------------------------------
// Assign toolbar — only visible to SUPERADMIN
// ---------------------------------------------------------------------------

interface AssignToolbarProps {
  selectedIds: Set<string>
  testers: Tester[]
  onAssign: (assigneeId: string) => Promise<void>
  onSelectAll: () => void
  onClearAll: () => void
  assigning: boolean
}

function AssignToolbar({ selectedIds, testers = [], onAssign, onSelectAll, onClearAll, assigning }: AssignToolbarProps) {
  const [assigneeId, setAssigneeId] = useState<string>('')

  const handleAssign = async () => {
    if (!assigneeId || selectedIds.size === 0) return
    await onAssign(assigneeId)
    setAssigneeId('')
  }

  return (
    <div className='flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 flex-wrap'>
      <span className='text-xs font-semibold text-blue-800 dark:text-blue-300 shrink-0'>Assign tests</span>

      <div className='flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400'>
        <span>{selectedIds.size} selected</span>
        <button type='button' onClick={onSelectAll} className='underline underline-offset-2 hover:no-underline'>
          select all
        </button>
        {selectedIds.size > 0 && (
          <button type='button' onClick={onClearAll} className='underline underline-offset-2 hover:no-underline'>
            clear
          </button>
        )}
      </div>

      <div className='flex items-center gap-2 ml-auto flex-wrap'>
        <Select value={assigneeId} onValueChange={setAssigneeId}>
          <SelectTrigger className='h-8 w-48 text-xs'>
            <SelectValue placeholder='Pick a tester…' />
          </SelectTrigger>
          <SelectContent>
            {testers.map(t => (
              <SelectItem key={t.id} value={t.id} className='text-xs'>
                <span>{t.name}</span>
                <span className='ml-1.5 text-muted-foreground'>{t.email}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size='sm' className='h-8 text-xs' disabled={!assigneeId || selectedIds.size === 0 || assigning} onClick={handleAssign}>
          {assigning ? 'Assigning…' : `Assign ${selectedIds.size > 0 ? `(${selectedIds.size})` : ''}`}
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Regression impact panel
// ---------------------------------------------------------------------------

function RegressionPanel() {
  const [input, setInput] = useState('')
  const [results, setResults] = useState<RegressionImpactResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    const files = input
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean)
    if (!files.length) return
    setLoading(true)
    setSearched(false)
    try {
      const r = await getRegressionImpact({ data: { changedFiles: files } })
      setResults(Array.isArray(r) ? r : [])
      setSearched(true)
    } catch {
      setResults([])
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const totalAffected = new Set(results.flatMap(r => r.affectedTests.map(t => t.id))).size

  return (
    <Card className='rounded-none border-x-0 border-t-0'>
      <CardHeader className='pb-3 px-4'>
        <div className='flex items-center gap-2'>
          <SearchIcon className='size-4 text-muted-foreground' />
          <CardTitle className='text-sm'>Regression Impact</CardTitle>
        </div>
        <p className='text-xs text-muted-foreground'>Paste changed file paths (one per line) to see which tests are affected.</p>
      </CardHeader>
      <CardContent className='space-y-3 px-4 pb-4'>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={2}
          placeholder='apps/web/src/lib/billing/credit-engine.ts'
          className='text-xs font-mono resize-none'
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault()
              handleSearch()
            }
          }}
        />
        <div className='flex items-center gap-2'>
          <Button size='sm' onClick={handleSearch} disabled={loading || !input.trim()}>
            {loading ? 'Searching…' : 'Find affected tests'}
          </Button>
          {searched && (
            <span className='text-xs text-muted-foreground'>
              {totalAffected} test{totalAffected !== 1 ? 's' : ''} affected
            </span>
          )}
          {searched && results.length > 0 && (
            <Button
              variant='ghost'
              size='sm'
              className='ml-auto text-xs'
              onClick={() => {
                setResults([])
                setSearched(false)
                setInput('')
              }}
            >
              Clear
            </Button>
          )}
        </div>

        {searched && results.length > 0 && (
          <div className='space-y-3 pt-1'>
            {results.map(r => (
              <div key={r.changedFile}>
                <div className='flex items-center gap-2 mb-1.5'>
                  <code className='text-xs bg-muted px-2 py-0.5 rounded font-mono text-blue-700 dark:text-blue-400 break-all'>{r.changedFile}</code>
                  <Badge variant='outline' className='shrink-0 text-xs'>
                    {r.affectedTests.length} test{r.affectedTests.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {r.affectedTests.length === 0 ? (
                  <p className='text-xs text-muted-foreground px-2'>No tests reference this file.</p>
                ) : (
                  <div className='rounded-lg border overflow-hidden'>
                    {r.affectedTests.map((t, i) => (
                      <button
                        key={t.id}
                        type='button'
                        onClick={() => showTestAside(<TestDetailAside testId={t.id} open onClose={closeTestAside} />)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left ${i < r.affectedTests.length - 1 ? 'border-b' : ''}`}
                      >
                        <OutcomeIcon outcome={t.lastOutcome} />
                        <span className='text-xs font-mono text-muted-foreground w-24 shrink-0'>{t.id}</span>
                        <span className='flex-1 text-sm font-medium'>{t.title}</span>
                        <RiskBadge risk={t.risk} />
                        <OutcomeBadge outcome={t.lastOutcome} />
                        <ChevronRightIcon className='size-4 text-muted-foreground shrink-0' />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {searched && results.every(r => r.affectedTests.length === 0) && (
          <p className='text-sm text-muted-foreground text-center py-2'>No tests reference the changed files.</p>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function QaTestsPage() {
  const user = useAuthenticatedUser()
  const userId = (user as { id?: string } | null)?.id ?? ''
  const userAuthorization = (user as { authorization?: { permissions?: string[] } } | null)?.authorization
  const canAssign = userAuthorization?.permissions?.includes(Permissions.QA_ASSIGN_TEST) ?? false
  // Show assignment UI if the user can assign tests
  const isSuperAdmin = canAssign

  const [recentRuns, setRecentRuns] = useState<RecentRun[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Assignment state (SUPERADMIN only)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [testers, setTesters] = useState<Tester[]>([])
  // RecentRun state now also carries assignedTestCaseIds from the server
  const [assignedTestCaseIds, setAssignedTestCaseIds] = useState<string[] | null>(null)

  const [selectedTestIds, setSelectedTestIds] = useState<Set<string>>(new Set())
  const [assigning, setAssigning] = useState(false)

  useEffect(() => {
    getRecentRuns()
      .then(r => {
        const result = r as { assignedTestCaseIds: string[] | null; runs: RecentRun[] }
        setRecentRuns(result.runs)
        setAssignedTestCaseIds(result.assignedTestCaseIds)
      })
      .catch(() => {})
  }, [])

  // Load testers + assignments only for SUPERADMIN
  useEffect(() => {
    if (!isSuperAdmin) return
    Promise.all([getTesters().catch(() => [] as Tester[]), getAssignments().catch(() => [] as Assignment[])]).then(([t, a]) => {
      setTesters(t as Tester[])
      setAssignments(a as Assignment[])
    })
  }, [isSuperAdmin])

  const runMap = new Map(recentRuns.map(r => [r.testCaseId, r]))
  const assignmentMap = new Map(assignments.map(a => [a.testCaseId, a]))

  // Visible tests:
  // - SUPERADMIN (null): sees everything (can view + assign, run guard is server-side)
  // - TESTER: sees only tests assigned to them
  const assignedSet = assignedTestCaseIds !== null ? new Set(assignedTestCaseIds) : null
  const visibleTests = assignedSet !== null ? ALL_TEST_CASES.filter(tc => assignedSet.has(tc.id)) : ALL_TEST_CASES

  const groups = groupByFeature(visibleTests)
  const featureOrder = ['auth', 'pos', 'inventory', 'billing', 'permissions']
  const allTestIds = visibleTests.map(tc => tc.id)

  // ── Selection helpers ────────────────────────────────────────────────────

  const toggleTest = (id: string) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleFeature = (featureTestIds: string[], allSelected: boolean) => {
    setSelectedTestIds(prev => {
      const next = new Set(prev)
      if (allSelected) featureTestIds.forEach(id => next.delete(id))
      else featureTestIds.forEach(id => next.add(id))
      return next
    })
  }

  const selectAll = () => setSelectedTestIds(new Set(allTestIds))
  const clearAll = () => setSelectedTestIds(new Set())

  // ── Assign handler ───────────────────────────────────────────────────────

  const handleAssign = async (assigneeId: string) => {
    if (selectedTestIds.size === 0) return
    setAssigning(true)
    try {
      const result = await assignTests({ data: { testCaseIds: [...selectedTestIds], assigneeId } })
      // Refresh assignments list
      const fresh = await getAssignments()
      setAssignments(fresh as Assignment[])
      setSelectedTestIds(new Set())
      const tester = testers.find(t => t.id === assigneeId)
      const count = (result as { assigned: number }).assigned
      toast.success(`Assigned ${count} test${count !== 1 ? 's' : ''} to ${tester?.name ?? 'tester'}.`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast.error(`Assignment failed: ${msg}`)
    } finally {
      setAssigning(false)
    }
  }

  // ── Row open handler ─────────────────────────────────────────────────────

  const handleSelectTest = (tc: QaTestCase) => {
    setSelectedId(tc.id)

    // Determine if this user can run the test:
    // - Assigned to someone else → disabled for everyone else including SUPERADMIN
    // - Unassigned + not SUPERADMIN → disabled
    const assignment = assignmentMap.get(tc.id)
    let disabledReason: string | undefined
    if (assignment) {
      if (assignment.assigneeId !== userId) {
        disabledReason = `Assigned to ${assignment.assigneeName}.`
      }
    } else if (!isSuperAdmin) {
      disabledReason = 'Not assigned. Ask a SUPERADMIN to assign it to you.'
    }

    showTestAside(
      <TestDetailAside
        testId={tc.id}
        open
        {...(disabledReason ? { disabledReason } : {})}
        onClose={() => {
          setSelectedId(null)
          closeTestAside()
        }}
      />,
    )
  }

  return (
    <div className='flex w-full h-full overflow-hidden'>
      {/* ── Main content ── */}
      <div className='flex-1 min-w-0 overflow-y-auto'>
        {/* Assign toolbar (SUPERADMIN only) */}
        {isSuperAdmin && (
          <AssignToolbar
            selectedIds={selectedTestIds}
            testers={testers}
            onAssign={handleAssign}
            onSelectAll={selectAll}
            onClearAll={clearAll}
            assigning={assigning}
          />
        )}

        {/* Regression panel */}
        <RegressionPanel />

        <Separator />

        {/* Test catalogue */}
        <div className='divide-y'>
          {featureOrder.map(feature => {
            const tests = groups[feature]
            if (!tests?.length) return null

            const featureTestIds = tests.map(tc => tc.id)
            const allFeatureSelected = featureTestIds.every(id => selectedTestIds.has(id))
            const someFeatureSelected = featureTestIds.some(id => selectedTestIds.has(id))

            return (
              <div key={feature}>
                {/* Feature header */}
                <div className='px-4 py-2 bg-muted/30 border-b flex items-center gap-3'>
                  {/* Select-all checkbox for this feature group (SUPERADMIN only) */}
                  {isSuperAdmin && (
                    <Checkbox
                      checked={allFeatureSelected ? true : someFeatureSelected ? 'indeterminate' : false}
                      onCheckedChange={() => toggleFeature(featureTestIds, allFeatureSelected)}
                      aria-label={`Select all ${FEATURE_LABELS[feature] ?? feature} tests`}
                      className='shrink-0'
                    />
                  )}
                  <h2 className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>
                    {FEATURE_LABELS[feature] ?? feature}
                    <span className='ml-2 font-normal normal-case'>
                      ({tests.filter(t => runMap.get(t.id)?.outcome === 'PASSED').length}/{tests.length} passed)
                    </span>
                  </h2>
                </div>

                {/* Rows */}
                {tests.map(tc => {
                  const run = runMap.get(tc.id)
                  const assignment = assignmentMap.get(tc.id)
                  const isSelected = selectedId === tc.id
                  const isChecked = selectedTestIds.has(tc.id)

                  return (
                    <div
                      key={tc.id}
                      className={`flex items-center border-b transition-colors ${isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''} ${isChecked ? 'bg-blue-50/50 dark:bg-blue-950/10' : 'hover:bg-primary/5'}`}
                    >
                      {/* Row checkbox (SUPERADMIN only) */}
                      {isSuperAdmin && (
                        <div className='pl-4 pr-2 py-3 shrink-0' onClick={e => e.stopPropagation()}>
                          <Checkbox checked={isChecked} onCheckedChange={() => toggleTest(tc.id)} aria-label={`Select test ${tc.id}`} />
                        </div>
                      )}

                      {/* Clickable row content */}
                      <button
                        type='button'
                        onClick={() => handleSelectTest(tc)}
                        className={`flex-1 flex items-center gap-3 ${isSuperAdmin ? 'pr-4 py-3' : 'px-4 py-3'} text-left min-w-0`}
                      >
                        <OutcomeIcon outcome={run?.outcome ?? null} />
                        <span className='text-xs font-mono text-muted-foreground w-24 shrink-0'>{tc.id}</span>
                        <span className='flex-1 text-sm font-medium truncate'>{tc.title}</span>
                        {/* Assignee label */}
                        {assignment && <AssigneeBadge name={assignment.assigneeName} />}
                        <RiskBadge risk={tc.risk} />
                        <OutcomeBadge outcome={run?.outcome ?? null} />
                        <ChevronRightIcon className='size-4 text-muted-foreground shrink-0' />
                      </button>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Aside host ── */}
      <MountManager id={TEST_ASIDE_ID} />
    </div>
  )
}
