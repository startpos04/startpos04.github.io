/**
 * Permission Users Sidebar
 *
 * Side drawer shown when a permission row is clicked in the Permissions tab.
 * Lists admin users who have custom grants/revokes for that permission,
 * and allows adding/removing overrides.
 *
 * 1-to-1 mirror of web's permission-employees-sidebar.tsx adapted for AdminUser.
 */

import { Avatar, AvatarFallback } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { Textarea } from '@platform/components/ui/textarea'
import type { PermissionKey } from '@platform/lib/authorization/permission-keys'
import { getDefaultPermissionsForRole } from '@platform/lib/authorization/role-permissions'
import dayjs from '@platform/lib/dayjs'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, RotateCcw, Search, Shield, ShieldCheck, ShieldX, User, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import {
  fetchAdminPermissionsWithUsers,
  fetchAdminUsersWithPermissions,
  grantAdminPermission,
  removeAdminPermissionOverride,
  revokeAdminPermission,
} from '@/lib/permissions/permission-management'
import { closePermissionSidebar } from './permission-sidebar'

interface Props {
  permissionId: string
  onClose?: () => void
}

type UserStatus = 'role-default' | 'custom-granted' | 'custom-revoked' | 'not-assigned'

export function PermissionUsersSidebar({ permissionId, onClose }: Props) {
  const queryClient = useQueryClient()
  const handleClose = onClose ?? closePermissionSidebar
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const [showAddPanel, setShowAddPanel] = useState(false)

  const { data: permsData } = useQuery({
    queryKey: ['admin-permissions-with-users'],
    queryFn: () => fetchAdminPermissionsWithUsers(),
  })

  const permission = useMemo(
    () => permsData?.permissions.find(p => p.id === permissionId),
    [permsData, permissionId],
  )

  const { data: usersData } = useQuery({
    queryKey: ['admin-users-with-permissions'],
    queryFn: () => fetchAdminUsersWithPermissions(),
  })

  // Build status map: userId → UserStatus
  const statusMap = useMemo(() => {
    const map = new Map<string, UserStatus>()
    if (!usersData || !permission) return map

    for (const u of usersData.users) {
      const roleDefaults = getDefaultPermissionsForRole(u.role)
      map.set(u.id, roleDefaults.includes(permission.key as PermissionKey) ? 'role-default' : 'not-assigned')
    }
    for (const u of permission.usersWithGrant) map.set(u.id, 'custom-granted')
    for (const u of permission.usersWithRevoke) map.set(u.id, 'custom-revoked')
    return map
  }, [usersData, permission])

  const assignedUsers = useMemo(
    () => (usersData?.users ?? []).filter(u => {
      const s = statusMap.get(u.id)
      return s === 'role-default' || s === 'custom-granted'
    }),
    [usersData, statusMap],
  )

  const availableUsers = useMemo(
    () => (usersData?.users ?? []).filter(u => {
      const s = statusMap.get(u.id)
      return s === 'not-assigned' || s === 'custom-revoked'
    }),
    [usersData, statusMap],
  )

  const filter = <T extends { name: string; email: string }>(list: T[]) => {
    if (!searchQuery.trim()) return list
    const q = searchQuery.toLowerCase()
    return list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-permissions-with-users'] })
    queryClient.invalidateQueries({ queryKey: ['admin-users-with-permissions'] })
    setReason('')
    setSelectedUser(null)
    setShowAddPanel(false)
  }

  const grantMutation = useMutation({
    mutationFn: (d: { userId: string; permissionKey: string; reason?: string }) => grantAdminPermission({ data: d }),
    onSuccess: r => { toast.success(r.message); invalidate() },
    onError: (e: Error) => toast.error(e.message),
  })

  const revokeMutation = useMutation({
    mutationFn: (d: { userId: string; permissionKey: string; reason?: string }) => revokeAdminPermission({ data: d }),
    onSuccess: r => { toast.success(r.message); invalidate() },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMutation = useMutation({
    mutationFn: (d: { userId: string; permissionKey: string }) => removeAdminPermissionOverride({ data: d }),
    onSuccess: r => { toast.success(r.message); invalidate() },
    onError: (e: Error) => toast.error(e.message),
  })

  const busy = grantMutation.isPending || revokeMutation.isPending || removeMutation.isPending

  const handleGrant = (userId: string) => {
    if (!permission) return
    grantMutation.mutate({ userId, permissionKey: permission.key, ...(reason.trim() ? { reason: reason.trim() } : {}) })
  }
  const handleRevoke = (userId: string) => {
    if (!permission) return
    setSelectedUser(userId)
    revokeMutation.mutate({ userId, permissionKey: permission.key, ...(reason.trim() ? { reason: reason.trim() } : {}) })
  }
  const handleRemove = (userId: string) => {
    if (!permission) return
    removeMutation.mutate({ userId, permissionKey: permission.key })
  }

  if (!permission) {
    return (
      <div className='flex flex-col h-full items-center justify-center p-8'>
        <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mb-4' />
        <p className='text-sm text-muted-foreground'>Loading permission details…</p>
      </div>
    )
  }

  const filteredAssigned = filter(assignedUsers)
  const filteredAvailable = filter(availableUsers)

  return (
    <div className='flex flex-col h-full'>
      {/* Header */}
      <div className='flex items-start justify-between p-4 border-b shrink-0'>
        <div className='flex gap-3'>
          <div className='h-10 w-10 rounded-xl border shadow-sm shrink-0 flex items-center justify-center bg-primary/10'>
            <Shield className='h-5 w-5 text-primary' />
          </div>
          <div>
            <h2 className='text-base font-semibold leading-tight'>{permission.name}</h2>
            <div className='flex gap-1.5 mt-1 flex-wrap'>
              <Badge variant='secondary' className='text-[10px] py-0 h-4'>{permission.scope}</Badge>
              <Badge variant='outline' className='text-[10px] py-0 h-4'>
                {assignedUsers.length} {assignedUsers.length === 1 ? 'User' : 'Users'}
              </Badge>
            </div>
            {permission.description && (
              <p className='text-xs text-muted-foreground mt-1.5'>{permission.description}</p>
            )}
          </div>
        </div>
        <Button variant='ghost' size='icon' onClick={handleClose} className='h-7 w-7 shrink-0'>
          <X className='size-4' />
        </Button>
      </div>

      {/* Search + Add */}
      <div className='p-4 pb-3 border-b shrink-0 space-y-3'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
          <Input
            placeholder='Search admin users…'
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className='pl-9'
          />
        </div>
        <Button onClick={() => setShowAddPanel(v => !v)} variant='outline' className='w-full'>
          <Plus className='h-4 w-4 mr-2' />
          Add User
        </Button>
      </div>

      {/* Body */}
      <div className='flex-1 overflow-y-auto'>
        <div className='p-4 space-y-6'>
          {/* Add panel */}
          {showAddPanel && (
            <div className='border rounded-lg p-4 space-y-4 bg-muted/30'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold'>Available Users</h3>
                <Button variant='ghost' size='sm' onClick={() => setShowAddPanel(false)}>Cancel</Button>
              </div>
              {filteredAvailable.length === 0 ? (
                <div className='text-center py-6 text-muted-foreground'>
                  <User className='mx-auto h-8 w-8 mb-2 opacity-50' />
                  <p className='text-sm'>No available users</p>
                </div>
              ) : (
                <div className='space-y-2 max-h-60 overflow-y-auto'>
                  {filteredAvailable.map(u => {
                    const status = statusMap.get(u.id)
                    const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || u.email.slice(0, 2).toUpperCase()
                    return (
                      <div key={u.id} className='flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent transition-colors'>
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-8 w-8'>
                            <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className='font-medium text-sm'>{u.name || u.email}</p>
                            <p className='text-xs text-muted-foreground'>{u.email}</p>
                          </div>
                        </div>
                        <Button
                          size='sm'
                          variant={status === 'custom-revoked' ? 'outline' : 'default'}
                          disabled={busy}
                          onClick={() => handleGrant(u.id)}
                        >
                          {busy && selectedUser === u.id
                            ? <Loader2 className='h-3 w-3 animate-spin' />
                            : status === 'custom-revoked'
                              ? <><RotateCcw className='h-3 w-3 mr-1' />Restore</>
                              : <><Plus className='h-3 w-3 mr-1' />Add</>}
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Assigned users */}
          <div>
            <h3 className='font-semibold mb-4'>Users with Permission</h3>
            {filteredAssigned.length === 0 ? (
              <div className='text-center py-12 text-muted-foreground border rounded-lg'>
                <User className='mx-auto h-12 w-12 mb-4 opacity-50' />
                <p>No users found</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {filteredAssigned.map(u => {
                  const status = statusMap.get(u.id)
                  const isRoleDefault = status === 'role-default'
                  const isCustomGrant = status === 'custom-granted'
                  const grantInfo = permission.usersWithGrant.find(g => g.id === u.id)
                  const initials = u.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || u.email.slice(0, 2).toUpperCase()

                  return (
                    <div key={u.id} className='border rounded-lg p-4 space-y-3 bg-card'>
                      <div className='flex items-start justify-between gap-3'>
                        <div className='flex items-center gap-3'>
                          <Avatar className='h-10 w-10'>
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className='font-semibold'>{u.name || u.email}</p>
                            <p className='text-sm text-muted-foreground'>{u.email}</p>
                            <Badge variant='outline' className='mt-1 text-xs'>{u.role}</Badge>
                          </div>
                        </div>
                        <div className='flex flex-col items-end gap-2'>
                          {isRoleDefault && (
                            <Badge variant='outline' className='gap-1'>
                              <Shield className='h-3 w-3' />Role Default
                            </Badge>
                          )}
                          {isCustomGrant && (
                            <Badge className='gap-1 bg-green-600 hover:bg-green-700'>
                              <ShieldCheck className='h-3 w-3' />Custom Grant
                            </Badge>
                          )}
                        </div>
                      </div>

                      {isCustomGrant && grantInfo && (
                        <div className='text-xs text-muted-foreground space-y-1'>
                          {grantInfo.grantedAt && <p>Granted {dayjs(grantInfo.grantedAt).fromNow()}</p>}
                          {grantInfo.note && (
                            <div className='bg-muted/50 rounded p-2'>
                              <span className='font-medium'>Reason:</span> {grantInfo.note}
                            </div>
                          )}
                        </div>
                      )}

                      <div className='flex gap-2 pt-2 border-t'>
                        {isCustomGrant && (
                          <>
                            <Button size='sm' variant='outline' disabled={busy} className='flex-1' onClick={() => handleRemove(u.id)}>
                              {busy && selectedUser === u.id
                                ? <Loader2 className='h-3 w-3 mr-2 animate-spin' />
                                : <RotateCcw className='h-3 w-3 mr-2' />}
                              Reset to Default
                            </Button>
                            <Button size='sm' variant='destructive' disabled={busy} className='flex-1' onClick={() => handleRevoke(u.id)}>
                              {busy && selectedUser === u.id
                                ? <Loader2 className='h-3 w-3 mr-2 animate-spin' />
                                : <ShieldX className='h-3 w-3 mr-2' />}
                              Revoke
                            </Button>
                          </>
                        )}
                        {isRoleDefault && (
                          <Button size='sm' variant='destructive' disabled={busy} className='w-full' onClick={() => handleRevoke(u.id)}>
                            {busy && selectedUser === u.id
                              ? <Loader2 className='h-3 w-3 mr-2 animate-spin' />
                              : <ShieldX className='h-3 w-3 mr-2' />}
                            Revoke Permission
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Reason input */}
          {selectedUser && !busy && (
            <div className='border rounded-lg p-4 space-y-3 bg-muted/30'>
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder='Why are you making this change?'
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
