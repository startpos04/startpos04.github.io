/**
 * /dashboard — Admin Panel Home
 *
 * Shows a platform overview for the logged-in admin:
 *   - V1 certification readiness
 *   - QA coverage stats
 *   - Open defect counts
 *   - Recent defects
 *   - Active testers
 *   - Quick-nav cards
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@platform/components/ui/card'
import { Progress } from '@platform/components/ui/progress'
import { Separator } from '@platform/components/ui/separator'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { APP_NAME } from '@platform/lib/constants'
import { createFileRoute, Link } from '@tanstack/react-router'
import { AlertTriangleIcon, BugIcon, CheckCircle2Icon, ClipboardCheckIcon, FlaskConicalIcon, ListIcon, ShieldIcon, TrophyIcon, UsersIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { RequireAdminPermission } from '@/components/custom/require-admin-permission'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import type { CampaignSummary } from '@/lib/qa/campaign-service'
import { getCampaigns } from '@/lib/qa/campaign-service'
import type { DefectRow } from '@/lib/qa/defect-tracker'
import { listDefects } from '@/lib/qa/defect-tracker'
import { getTesters } from '@/lib/qa/test-runner'
import { ALL_TEST_CASES } from '../../../../../qa-definitions'

export const Route = createFileRoute('/(private)/(dashboard)/dashboard/')({
  component: DashboardPage,
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Tester {
  id: string
  name: string
  email: string
  role: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function initials(name: string, email: string) {
  return (name || email)
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function RoleChip({ role }: { role: string }) {
  const colors: Record<string, string> = {
    SUPERADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
    TESTER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    SUPPORT: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
    FINANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    DEVELOPER: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400',
  }
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${colors[role] ?? 'bg-muted text-muted-foreground'}`}>{role}</span>
}

// ---------------------------------------------------------------------------
// V1 Status banner
// ---------------------------------------------------------------------------

function V1StatusBanner({ campaigns }: { campaigns: CampaignSummary[] }) {
  const c = campaigns[0]
  if (!c) return null

  const total = c.workflowProgress.reduce((s, w) => s + w.total, 0)
  const passed = c.workflowProgress.reduce((s, w) => s + w.passed, 0)
  const pct = total > 0 ? Math.round((passed / total) * 100) : 0
  const criticalOpen = c.openCriticalDefects
  const highOpen = c.openHighDefects
  const isReady = pct === 100 && criticalOpen === 0 && highOpen === 0

  return (
    <Card className={`border-2 ${isReady ? 'border-green-400/50' : 'border-amber-300/50'}`}>
      <CardContent className='pt-5 pb-4'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2'>
            <ShieldIcon className={`size-5 ${isReady ? 'text-green-500' : 'text-amber-500'}`} />
            <span className='font-semibold'>V1 Certification</span>
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
          <span className='text-sm font-bold tabular-nums'>
            {passed}/{total} <span className='text-muted-foreground font-normal'>tests passed</span>
          </span>
        </div>

        <Progress value={pct} className='h-2 mb-3' />

        <div className='grid grid-cols-3 gap-3'>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className='text-2xl font-bold text-green-600'>{passed}</p>
            <p className='text-xs text-muted-foreground'>Passed</p>
          </div>
          <div className={`rounded-lg border bg-muted/30 p-3 text-center`}>
            <p className={`text-2xl font-bold ${criticalOpen > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{criticalOpen}</p>
            <p className='text-xs text-muted-foreground'>Critical defects</p>
          </div>
          <div className='rounded-lg border bg-muted/30 p-3 text-center'>
            <p className={`text-2xl font-bold ${highOpen > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>{highOpen}</p>
            <p className='text-xs text-muted-foreground'>High defects</p>
          </div>
        </div>

        {!isReady && (criticalOpen > 0 || highOpen > 0) && (
          <div className='mt-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30 px-3 py-2'>
            <p className='text-xs font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-1.5'>
              <AlertTriangleIcon className='size-3.5' />
              V1 blockers
            </p>
            <ul className='mt-1 space-y-0.5'>
              {criticalOpen > 0 && (
                <li className='text-xs text-amber-900 dark:text-amber-300'>
                  · {criticalOpen} open CRITICAL defect{criticalOpen > 1 ? 's' : ''}
                </li>
              )}
              {highOpen > 0 && (
                <li className='text-xs text-amber-900 dark:text-amber-300'>
                  · {highOpen} open HIGH defect{highOpen > 1 ? 's' : ''}
                </li>
              )}
              {pct < 100 && (
                <li className='text-xs text-amber-900 dark:text-amber-300'>
                  · {total - passed} test{total - passed !== 1 ? 's' : ''} not yet run
                </li>
              )}
            </ul>
          </div>
        )}

        <div className='flex gap-2 mt-3'>
          <Button size='sm' variant='outline' asChild>
            <Link to='/qa'>View campaigns</Link>
          </Button>
          <Button size='sm' variant='outline' asChild>
            <Link to='/qa/defects' search={{ page: 1 }}>
              View defects
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// QA coverage by feature
// ---------------------------------------------------------------------------

function CoverageBreakdown({ campaigns }: { campaigns: CampaignSummary[] }) {
  const c = campaigns[0]
  if (!c) return null

  return (
    <Card>
      <CardHeader className='pb-2'>
        <CardTitle className='text-sm'>Test Coverage by Area</CardTitle>
      </CardHeader>
      <CardContent className='space-y-2.5'>
        {c.workflowProgress.map(w => (
          <div key={w.feature} className='flex items-center gap-3'>
            <span className='text-xs text-muted-foreground w-32 shrink-0'>{w.label}</span>
            <Progress value={w.pct} className='h-1.5 flex-1' />
            <span className='text-xs tabular-nums text-muted-foreground w-14 text-right'>
              {w.passed}/{w.total}
              {w.pct === 100 && <CheckCircle2Icon className='inline ml-1 size-3 text-green-500' />}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Recent defects
// ---------------------------------------------------------------------------

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  MEDIUM: 'bg-yellow-500 text-white',
  LOW: 'bg-blue-500 text-white',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800',
  INVESTIGATING: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800',
  FIXED: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
  RETEST_REQUIRED: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
  RESOLVED: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800',
  WONT_FIX: 'bg-muted text-muted-foreground border-border',
}

function RecentDefects({ defects }: { defects: DefectRow[] }) {
  return (
    <Card>
      <CardHeader className='pb-2 flex flex-row items-center justify-between'>
        <CardTitle className='text-sm'>Recent Defects</CardTitle>
        <Button size='sm' variant='ghost' className='text-xs h-7' asChild>
          <Link to='/qa/defects' search={{ page: 1 }}>
            View all
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {defects.length === 0 ? (
          <div className='flex items-center gap-2 py-4 justify-center text-muted-foreground text-sm'>
            <CheckCircle2Icon className='size-4 text-green-500' />
            No open defects
          </div>
        ) : (
          <div className='divide-y'>
            {defects.slice(0, 5).map(d => (
              <Link
                key={d.id}
                to='/qa/defects/$defectId'
                params={{ defectId: d.id }}
                className='flex items-start gap-3 py-2.5 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors'
              >
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 mt-0.5 ${PRIORITY_COLORS[d.priority] ?? ''}`}>
                  {d.priority.slice(0, 4)}
                </span>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>{d.title}</p>
                  <p className='text-xs text-muted-foreground font-mono'>{d.testCaseId}</p>
                </div>
                <Badge variant='outline' className={`text-xs shrink-0 ${STATUS_COLORS[d.status] ?? ''}`}>
                  {d.status.replace('_', ' ')}
                </Badge>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Active testers
// ---------------------------------------------------------------------------

function ActiveTesters({ testers }: { testers: Tester[] }) {
  return (
    <Card>
      <CardHeader className='pb-2 flex flex-row items-center justify-between'>
        <CardTitle className='text-sm'>Admin Users</CardTitle>
        <span className='text-xs text-muted-foreground'>{testers.length} total</span>
      </CardHeader>
      <CardContent>
        {testers.length === 0 ? (
          <p className='text-sm text-muted-foreground text-center py-4'>No users found.</p>
        ) : (
          <div className='space-y-2'>
            {testers.map(t => (
              <div key={t.id} className='flex items-center gap-3'>
                <div className='size-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0'>
                  {initials(t.name, t.email)}
                </div>
                <div className='flex-1 min-w-0'>
                  <p className='text-sm font-medium truncate'>{t.name}</p>
                  <p className='text-xs text-muted-foreground truncate'>{t.email}</p>
                </div>
                <RoleChip role={t.role} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// Quick nav cards
// ---------------------------------------------------------------------------

const QUICK_NAV = [
  {
    label: 'Campaigns',
    description: 'V1 certification progress',
    icon: TrophyIcon,
    href: '/qa',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/30',
  },
  {
    label: 'All Tests',
    description: `${ALL_TEST_CASES.length} test cases`,
    icon: ListIcon,
    href: '/qa/tests',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    label: 'Defects',
    description: 'Track and resolve issues',
    icon: BugIcon,
    href: '/qa/defects',
    color: 'text-red-500',
    bg: 'bg-red-50 dark:bg-red-950/30',
  },
  {
    label: 'Environment',
    description: 'QA environment status',
    icon: FlaskConicalIcon,
    href: '/qa/environment',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/30',
  },
  {
    label: 'Permissions',
    description: 'Admin user permissions',
    icon: ShieldIcon,
    href: '/permissions',
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    label: 'QA Tests',
    description: 'Assign tests to testers',
    icon: ClipboardCheckIcon,
    href: '/qa/tests',
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30',
  },
] as const

function QuickNav() {
  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
      {QUICK_NAV.map(item => (
        <Link
          key={item.href + item.label}
          to={item.href as never}
          className='rounded-xl border p-4 hover:bg-muted/50 transition-colors flex flex-col gap-2 group'
        >
          <div className={`size-9 rounded-lg ${item.bg} flex items-center justify-center`}>
            <item.icon className={`size-5 ${item.color}`} />
          </div>
          <div>
            <p className='text-sm font-semibold group-hover:text-primary transition-colors'>{item.label}</p>
            <p className='text-xs text-muted-foreground'>{item.description}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function DashboardPage() {
  const user = useAuthenticatedUser()
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [defects, setDefects] = useState<DefectRow[]>([])
  const [testers, setTesters] = useState<Tester[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([getCampaigns(), listDefects({ data: { limit: 5, offset: 0 } }), getTesters()]).then(([c, d, t]) => {
      if (c.status === 'fulfilled') setCampaigns(Array.isArray(c.value) ? c.value : [])
      if (d.status === 'fulfilled') setDefects((d.value as { defects: DefectRow[] })?.defects ?? [])
      if (t.status === 'fulfilled') setTesters((t.value as Tester[]) ?? [])
      setLoading(false)
    })
  }, [])

  const userRole = (user as { role?: string } | null)?.role ?? '—'
  const userName = (user as { name?: string; email?: string } | null)?.name ?? (user as { email?: string } | null)?.email ?? '—'
  const totalTests = ALL_TEST_CASES.length
  const criticalTests = ALL_TEST_CASES.filter(tc => tc.risk === 'CRITICAL').length

  return (
    <RequireAdminPermission permission={Permissions.ADMIN_VIEW_DASHBOARD}>
      <div className='h-full overflow-y-auto'>
        <div className='px-4 pb-4 space-y-4'>
          {/* Header */}
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h1 className='text-2xl font-bold'>{APP_NAME} Admin</h1>
              <p className='text-sm text-muted-foreground mt-0.5'>
                Welcome back, <span className='font-medium text-foreground'>{userName}</span>
                <span className='ml-2'>
                  <RoleChip role={userRole} />
                </span>
              </p>
            </div>
            <div className='flex items-center gap-2 text-xs text-muted-foreground shrink-0'>
              <UsersIcon className='size-4' />
              <span>{testers.length} admin users</span>
            </div>
          </div>

          {/* Stats strip */}
          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3'>
            <div className='rounded-xl border bg-card p-4'>
              <p className='text-2xl font-bold'>{totalTests}</p>
              <p className='text-xs text-muted-foreground'>Total test cases</p>
            </div>
            <div className='rounded-xl border bg-card p-4'>
              <p className='text-2xl font-bold text-red-600'>{criticalTests}</p>
              <p className='text-xs text-muted-foreground'>Critical tests</p>
            </div>
            <div className='rounded-xl border bg-card p-4'>
              <p className={`text-2xl font-bold ${campaigns[0]?.openCriticalDefects ? 'text-destructive' : 'text-muted-foreground'}`}>
                {loading ? '—' : (campaigns[0]?.openCriticalDefects ?? 0)}
              </p>
              <p className='text-xs text-muted-foreground'>Open critical defects</p>
            </div>
            <div className='rounded-xl border bg-card p-4'>
              <p className={`text-2xl font-bold ${campaigns[0]?.openHighDefects ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {loading ? '—' : (campaigns[0]?.openHighDefects ?? 0)}
              </p>
              <p className='text-xs text-muted-foreground'>Open high defects</p>
            </div>
          </div>

          {/* V1 certification banner */}
          {loading ? (
            <Card>
              <CardContent className='py-8 flex items-center justify-center gap-3 text-muted-foreground'>
                <div className='size-4 border-2 border-primary border-t-transparent rounded-full animate-spin' />
                Loading certification status…
              </CardContent>
            </Card>
          ) : (
            <V1StatusBanner campaigns={campaigns} />
          )}

          {/* Quick nav */}
          <div>
            <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3'>Quick Access</p>
            <QuickNav />
          </div>

          <Separator />

          {/* Two-column: coverage + testers, then defects */}
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
            {!loading && <CoverageBreakdown campaigns={campaigns} />}
            <ActiveTesters testers={testers} />
          </div>

          {!loading && <RecentDefects defects={defects} />}
        </div>
      </div>
    </RequireAdminPermission>
  )
}
