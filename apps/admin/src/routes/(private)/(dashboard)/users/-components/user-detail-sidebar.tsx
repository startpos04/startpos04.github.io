/**
 * UserDetailSidebar
 *
 * Full tenant user detail — exactly mirrors web EmployeeDetailsSidebar.
 * Tabs: Overview | Sessions
 * Actions: Revoke sessions, Disable / Re-enable account
 */

import { WarningPrompt } from '@platform/components/custom/prompt/warning-prompt'
import Tab from '@platform/components/custom/tab'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Separator } from '@platform/components/ui/separator'
import dayjs from '@platform/lib/dayjs'
import MountManager from '@platform/lib/mount-manager'
import { cn } from '@platform/lib/utils'
import { Ban, BriefcaseIcon, Calendar, Mail, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { TenantUserRow } from '@/lib/server-fn/tenant-users'
import { disableUser, enableUser, getTenantUserDetail, revokeUserSessions } from '@/lib/server-fn/tenant-users'
import { closeUserSidebar } from './user-sidebar'

// ---------------------------------------------------------------------------
// Role badge colours (mirrors employee-columns in web)
// ---------------------------------------------------------------------------
const ROLE_COLORS: Record<string, string> = {
  OWNER: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  ADMIN: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  SUPERVISOR: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  CASHIER: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  SERVICE_PROVIDER: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400',
}

// ---------------------------------------------------------------------------
// Overview tab — mirrors -overview-tab.tsx exactly
// ---------------------------------------------------------------------------
function OverviewTab({ user, detail }: { user: TenantUserRow; detail: any }) {
  const isOnline = user.hasActiveSession

  const handleRevokeSession = () => {
    MountManager.show(WarningPrompt, {
      title: 'Revoke All Sessions',
      description: 'This will immediately sign the user out of all devices.',
      onConfirm: async () => {
        const r = (await revokeUserSessions({ data: { userId: user.id } })) as any
        toast.success(r.message)
        return true
      },
    })
  }

  const handleDisable = () => {
    MountManager.show(WarningPrompt, {
      title: 'Disable Account',
      description: `"${user.name}" will not be able to log in. Their data is preserved.`,
      onConfirm: async () => {
        const r = (await disableUser({ data: { userId: user.id } })) as any
        toast.success(r.message)
        return true
      },
    })
  }

  const handleEnable = async () => {
    const r = (await enableUser({ data: { userId: user.id } })) as any
    toast.success(r.message)
  }

  return (
    <div className='space-y-5'>
      {/* Contact */}
      <div className='space-y-3'>
        <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
          <Mail className='w-3 h-3' /> Contact
        </h4>
        <div className='space-y-2.5'>
          <div className='flex items-center gap-2.5 text-sm'>
            <Mail className='h-3.5 w-3.5 text-muted-foreground shrink-0' />
            <span className='truncate'>{user.email}</span>
          </div>
          {user.contactNumber && (
            <div className='flex items-center gap-2.5 text-sm text-muted-foreground'>
              <span className='h-3.5 w-3.5 shrink-0 text-center text-xs'>📞</span>
              <span>{user.contactNumber}</span>
            </div>
          )}
          <div className='flex items-center gap-2.5 text-sm text-muted-foreground'>
            <Calendar className='h-3.5 w-3.5 shrink-0' />
            <span>Joined {user.createdAt ? dayjs(user.createdAt).format('MMM DD, YYYY') : '—'}</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Business membership */}
      {user.businessName && (
        <>
          <div className='space-y-3'>
            <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2'>
              <BriefcaseIcon className='w-3 h-3' /> Business
            </h4>
            <div className='rounded-xl border bg-card p-3 space-y-1'>
              <p className='text-sm font-semibold'>{user.businessName}</p>
              {user.branchName && <p className='text-xs text-muted-foreground'>{user.branchName}</p>}
            </div>
          </div>
          <Separator />
        </>
      )}

      {/* Activity stats */}
      <div className='space-y-3'>
        <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Activity</h4>
        <div className='grid grid-cols-3 gap-2'>
          <div className='rounded-xl border bg-card p-3 text-center'>
            <p className='text-2xl font-bold'>{user.salesCount}</p>
            <p className='text-[10px] text-muted-foreground uppercase font-bold mt-0.5'>Sales</p>
          </div>
          <div className='rounded-xl border bg-card p-3 text-center'>
            <p className='text-2xl font-bold'>{user.servicesCount}</p>
            <p className='text-[10px] text-muted-foreground uppercase font-bold mt-0.5'>Services</p>
          </div>
          <div className='rounded-xl border bg-card p-3 text-center'>
            <p className='text-2xl font-bold'>{detail?._count?.inventoryMovements ?? '—'}</p>
            <p className='text-[10px] text-muted-foreground uppercase font-bold mt-0.5'>Inv. moves</p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Session status */}
      <div className='space-y-3'>
        <h4 className='text-[10px] font-bold uppercase tracking-widest text-muted-foreground'>Session</h4>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-semibold'>{isOnline ? 'Currently active' : 'Offline'}</p>
            {detail?.sessions?.[0] && (
              <p className='text-[10px] text-muted-foreground mt-0.5'>
                {detail.sessions[0].ipAddress ?? 'Unknown IP'} · expires {dayjs(detail.sessions[0].expiresAt).fromNow()}
              </p>
            )}
          </div>
          <div className={cn('h-2 w-2 rounded-full shrink-0', isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
        </div>
      </div>

      <Separator />

      {/* Danger zone */}
      <div className='space-y-3'>
        <h4 className='text-[10px] font-bold uppercase tracking-widest text-destructive flex items-center gap-1.5'>
          <ShieldAlert className='h-3 w-3' /> Danger Zone
        </h4>
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-xs font-bold'>Revoke All Sessions</p>
              <p className='text-[10px] text-muted-foreground mt-0.5'>Forces sign-out on all devices.</p>
            </div>
            <Button variant='destructive' size='sm' className='h-7 text-xs' onClick={handleRevokeSession}>
              Sign Out
            </Button>
          </div>
          <div className='flex items-center justify-between'>
            {user.deletedAt ? (
              <>
                <div>
                  <p className='text-xs font-bold'>Re-enable Account</p>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>Restore login access.</p>
                </div>
                <Button variant='outline' size='sm' className='h-7 text-xs border-green-400/40 text-green-600 hover:bg-green-50' onClick={handleEnable}>
                  <ShieldCheck className='size-3 mr-1' /> Enable
                </Button>
              </>
            ) : (
              <>
                <div>
                  <p className='text-xs font-bold'>Disable Account</p>
                  <p className='text-[10px] text-muted-foreground mt-0.5'>Prevents login without deleting data.</p>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-7 text-xs border-destructive/40 text-destructive hover:bg-destructive/10'
                  onClick={handleDisable}
                >
                  <Ban className='size-3 mr-1' /> Disable
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sessions tab
// ---------------------------------------------------------------------------
function SessionsTab({ detail }: { detail: any }) {
  const sessions = detail?.sessions ?? []
  return (
    <div className='space-y-3'>
      {sessions.length === 0 ? (
        <p className='text-sm text-muted-foreground text-center py-8'>No active sessions.</p>
      ) : (
        sessions.map((s: any) => (
          <div key={s.id} className='rounded-xl border bg-card p-3 space-y-1'>
            <div className='flex justify-between items-center'>
              <p className='text-xs font-mono text-muted-foreground'>{s.ipAddress ?? 'Unknown IP'}</p>
              <Badge variant='outline' className='text-[10px]'>
                expires {dayjs(s.expiresAt).fromNow()}
              </Badge>
            </div>
            {s.userAgent && <p className='text-[10px] text-muted-foreground truncate'>{s.userAgent}</p>}
          </div>
        ))
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main sidebar component — mirrors EmployeeDetailsSidebar structure
// ---------------------------------------------------------------------------
interface Props {
  open?: boolean
  user: TenantUserRow
  onClose?: () => void
}

export function UserDetailSidebar({ user, onClose }: Props) {
  const handleClose = onClose ?? closeUserSidebar
  const [detail, setDetail] = useState<any>(null)

  useEffect(() => {
    getTenantUserDetail({ data: { userId: user.id } })
      .then(d => setDetail(d))
      .catch(() => {})
  }, [user.id])

  const initials =
    user.name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || user.email.slice(0, 2).toUpperCase()

  const isOnline = user.hasActiveSession

  return (
    <div className='flex flex-col h-full'>
      {/* Header — mirrors employee sidebar exactly */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div className='flex items-center gap-3'>
          <div className='h-10 w-10 rounded-full bg-muted flex items-center justify-center border overflow-hidden shrink-0'>
            {user.image ? (
              <img src={user.image} alt={user.name} className='h-full w-full object-cover' />
            ) : (
              <span className='text-sm font-bold text-muted-foreground'>{initials}</span>
            )}
          </div>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-semibold leading-tight'>{user.name}</h2>
              <div className={cn('h-1.5 w-1.5 rounded-full shrink-0', isOnline ? 'bg-green-500' : 'bg-muted-foreground/30')} />
            </div>
            <div className='flex gap-1.5 mt-1 flex-wrap'>
              <Badge variant='secondary' className={`text-[10px] py-0 h-4 ${ROLE_COLORS[user.role] ?? ''}`}>
                {user.role}
              </Badge>
              {user.emailVerified && (
                <Badge variant='outline' className='text-[10px] py-0 h-4 text-green-600 border-green-200 bg-green-50'>
                  Verified
                </Badge>
              )}
              {user.deletedAt && (
                <Badge variant='destructive' className='text-[10px] py-0 h-4'>
                  Disabled
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <span className='text-muted-foreground text-sm'>✕</span>
        </Button>
      </div>

      {/* Scrollable content */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        <Tab
          defaultValue='Overview'
          tabs={[
            { label: 'Overview', Component: OverviewTab, user, detail },
            { label: 'Sessions', Component: SessionsTab, detail },
          ]}
        />
      </div>
    </div>
  )
}
