/**
 * AccountDetailSidebar
 *
 * Shows an AdminUser's details: avatar, name, email, role, verified status.
 * Actions: Edit (name/role), Revoke all sessions, Delete account.
 *
 * Mirrors web's EmployeeDetailsSidebar.
 */

import { WarningPrompt } from '@platform/components/custom/prompt/warning-prompt'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@platform/components/ui/select'
import { Separator } from '@platform/components/ui/separator'
import MountManager from '@platform/lib/mount-manager'
import { createFileRoute } from '@tanstack/react-router'
import { Edit, LogOut, ShieldOff, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import type { AdminUserRow } from '@/lib/server-fn/admin-accounts'
import { deleteAdminUser, revokeAdminSessions, updateAdminUser } from '@/lib/server-fn/admin-accounts'
import { closeAccountSidebar } from '../-components/account-sidebar'

export const Route = createFileRoute('/(private)/(dashboard)/accounts/$accountId/' as never)({
  component: () => null,
})

interface Props {
  open?: boolean
  account: AdminUserRow
  onClose?: () => void
  onChanged?: () => void
}

const ROLES = ['SUPERADMIN', 'TESTER', 'SUPPORT', 'FINANCE', 'DEVELOPER'] as const

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  TESTER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  SUPPORT: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  FINANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  DEVELOPER: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400',
}

export function AccountDetailSidebar({ account, onClose, onChanged }: Props) {
  const handleClose = onClose ?? closeAccountSidebar
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(account.name)
  const [role, setRole] = useState(account.role)
  const [saving, setSaving] = useState(false)

  const initials =
    account.name
      .split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || account.email.slice(0, 2).toUpperCase()

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await updateAdminUser({ data: { id: account.id, name, role } })
      if (!result.success) {
        toast.error((result as { error: string }).error)
        return
      }
      toast.success('Account updated.')
      setEditing(false)
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update.')
    } finally {
      setSaving(false)
    }
  }

  const handleRevokeSessions = () => {
    MountManager.show(WarningPrompt, {
      title: 'Revoke All Sessions',
      description: `This will log "${account.name}" out of all devices immediately.`,
      onConfirm: async () => {
        const result = await revokeAdminSessions({ data: { userId: account.id } })
        toast.success(`${result.count} session${result.count !== 1 ? 's' : ''} revoked.`)
        return true
      },
    })
  }

  const handleDelete = () => {
    MountManager.show(WarningPrompt, {
      title: 'Delete Account',
      description: `Are you sure you want to delete "${account.name}"? They will lose all access to the admin panel.`,
      onConfirm: async () => {
        const result = await deleteAdminUser({ data: { id: account.id } })
        if (!result.success) {
          toast.error((result as { error: string }).error)
          return false
        }
        toast.success('Account deleted.')
        onChanged?.()
        handleClose()
        return true
      },
    })
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b shrink-0'>
        <div className='flex items-center gap-3'>
          <Avatar className='h-10 w-10 border border-border/50 shadow-sm'>
            <AvatarImage src={account.image ?? ''} alt={account.name} />
            <AvatarFallback className='bg-primary/5 text-primary text-sm font-bold'>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <div className='flex items-center gap-2'>
              <h2 className='text-base font-semibold leading-tight'>{account.name}</h2>
            </div>
            <div className='flex gap-1.5 mt-1 flex-wrap'>
              <Badge variant='outline' className={`text-[10px] py-0 h-4 ${ROLE_COLORS[account.role] ?? ''}`}>
                {account.role}
              </Badge>
              {account.emailVerified && (
                <Badge
                  variant='outline'
                  className='text-[10px] py-0 h-4 text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'
                >
                  Verified
                </Badge>
              )}
            </div>
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Body */}
      <div className='flex-1 overflow-y-auto p-4 space-y-5'>
        {/* Info / edit form */}
        {editing ? (
          <div className='space-y-4'>
            <div className='space-y-1.5'>
              <Label>Name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className='space-y-1.5'>
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex gap-2'>
              <Button size='sm' onClick={handleSave} disabled={saving} className='flex-1'>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  setEditing(false)
                  setName(account.name)
                  setRole(account.role)
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className='space-y-3'>
            <div className='rounded-lg border bg-muted/30 p-4 space-y-3'>
              <div>
                <p className='text-xs text-muted-foreground font-medium'>Email</p>
                <p className='text-sm mt-0.5'>{account.email}</p>
              </div>
              <Separator />
              <div>
                <p className='text-xs text-muted-foreground font-medium'>Role</p>
                <p className='text-sm mt-0.5'>{account.role}</p>
              </div>
              <Separator />
              <div>
                <p className='text-xs text-muted-foreground font-medium'>Member since</p>
                <p className='text-sm mt-0.5'>{new Date(account.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Danger zone */}
        <div className='space-y-2'>
          <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wide'>Actions</p>
          <Button variant='outline' size='sm' className='w-full justify-start gap-2' onClick={handleRevokeSessions}>
            <LogOut className='size-4' />
            Revoke all sessions
          </Button>
          <Button
            variant='outline'
            size='sm'
            className='w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30'
            onClick={handleDelete}
          >
            <ShieldOff className='size-4' />
            Delete account
          </Button>
        </div>
      </div>

      {/* Footer */}
      {!editing && (
        <div className='p-4 border-t shrink-0'>
          <Button
            size='sm'
            className='w-full shadow-sm shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]'
            onClick={() => setEditing(true)}
          >
            <Edit className='size-3.5 mr-2' />
            Edit Account
          </Button>
        </div>
      )}
    </div>
  )
}
