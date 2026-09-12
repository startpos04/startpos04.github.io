/**
 * Permission Assignment Dialog
 *
 * Dialog for granting/revoking custom admin permissions to/from an AdminUser.
 * Shows only ADMIN-scoped permissions, grouped by category with search.
 *
 * 1-to-1 mirror of web app's -permission-assignment-dialog.tsx.
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@platform/components/ui/collapsible'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@platform/components/ui/dialog'
import { Input } from '@platform/components/ui/input'
import { Label } from '@platform/components/ui/label'
import { ScrollArea } from '@platform/components/ui/scroll-area'
import { Separator } from '@platform/components/ui/separator'
import { Textarea } from '@platform/components/ui/textarea'
import { getDefaultPermissionsForRole } from '@platform/lib/authorization/role-permissions'
import type { MountProps } from '@platform/lib/mount-manager'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, RotateCcw, Search, Shield, ShieldCheck, ShieldX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { AdminPermissionDefinition, AdminUserWithPermissions } from '@/lib/permissions/permission-management'
import { fetchAdminPermissions, grantAdminPermission, removeAdminPermissionOverride, revokeAdminPermission } from '@/lib/permissions/permission-management'

interface Props extends MountProps {
  user: AdminUserWithPermissions
}

type PermissionStatus = 'role-default' | 'custom-granted' | 'custom-revoked'

export function PermissionAssignmentDialog({ user, open, onClose }: Props) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<AdminPermissionDefinition | null>(null)
  const [reason, setReason] = useState('')

  const { data } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => fetchAdminPermissions(),
  })

  const permissions = data?.permissions ?? []

  // Role defaults for this user
  const rolePermissions = useMemo(() => new Set(getDefaultPermissionsForRole(user.role) as string[]), [user.role])

  const statusMap = useMemo(() => {
    const map = new Map<string, PermissionStatus>()
    for (const p of permissions) {
      if (rolePermissions.has(p.key)) map.set(p.key, 'role-default')
    }
    for (const g of user.customGrants) map.set(g.permission.key, 'custom-granted')
    for (const r of user.customRevokes) map.set(r.permission.key, 'custom-revoked')
    return map
  }, [permissions, rolePermissions, user.customGrants, user.customRevokes])

  const getStatus = (key: string): PermissionStatus => statusMap.get(key) ?? 'role-default'

  // Filter + group by category
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return permissions
    const q = searchQuery.toLowerCase()
    return permissions.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.key.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.scope.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q),
    )
  }, [permissions, searchQuery])

  const grouped = useMemo(() => {
    const map = new Map<string, AdminPermissionDefinition[]>()
    for (const p of filtered) {
      const cat = p.category ?? 'Uncategorized'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [filtered])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-users-with-permissions'] })
    queryClient.invalidateQueries({ queryKey: ['admin-permissions-with-users'] })
    setSelected(null)
    setReason('')
  }

  const grantMutation = useMutation({
    mutationFn: (d: { userId: string; permissionKey: string; reason?: string }) => grantAdminPermission({ data: d }),
    onSuccess: r => {
      toast.success(r.message)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const revokeMutation = useMutation({
    mutationFn: (d: { userId: string; permissionKey: string; reason?: string }) => revokeAdminPermission({ data: d }),
    onSuccess: r => {
      toast.success(r.message)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const removeMutation = useMutation({
    mutationFn: (d: { userId: string; permissionKey: string }) => removeAdminPermissionOverride({ data: d }),
    onSuccess: r => {
      toast.success(r.message)
      invalidate()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const busy = grantMutation.isPending || revokeMutation.isPending || removeMutation.isPending
  const r = reason.trim() || undefined

  const handleGrant = () => {
    if (!selected) return
    grantMutation.mutate({ userId: user.id, permissionKey: selected.key, ...(r ? { reason: r } : {}) })
  }
  const handleRevoke = () => {
    if (!selected) return
    revokeMutation.mutate({ userId: user.id, permissionKey: selected.key, ...(r ? { reason: r } : {}) })
  }
  const handleRemove = () => {
    if (!selected) return
    removeMutation.mutate({ userId: user.id, permissionKey: selected.key })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-4xl h-[85vh] max-h-[85vh] flex flex-col'>
        <DialogHeader>
          <DialogTitle>Manage Permissions: {user.name || user.email}</DialogTitle>
          <DialogDescription>Grant or revoke custom permissions for this admin user. Role defaults are shown in gray.</DialogDescription>
        </DialogHeader>

        <div className='flex-1 flex flex-col gap-4 overflow-hidden'>
          {/* Search */}
          <div className='relative shrink-0'>
            <Search className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
            <Input placeholder='Search permissions...' value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className='pl-9' />
          </div>

          {/* Two-column layout */}
          <div className='flex-1 grid grid-cols-2 gap-4 overflow-hidden'>
            {/* Left — permission list */}
            <ScrollArea className='h-full border rounded-lg'>
              <div className='p-4 space-y-4'>
                {grouped.length === 0 ? (
                  <div className='text-center py-8 text-muted-foreground'>
                    <Shield className='mx-auto h-12 w-12 mb-4 opacity-50' />
                    <p>No permissions found</p>
                  </div>
                ) : (
                  grouped.map(([scope, perms]) => (
                    <Collapsible key={scope} defaultOpen>
                      <CollapsibleTrigger className='flex items-center justify-between w-full p-2 hover:bg-accent rounded-lg'>
                        <span className='font-semibold'>{scope}</span>
                        <Badge variant='outline'>{perms.length}</Badge>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className='mt-2 space-y-1'>
                          {perms.map(perm => {
                            const status = getStatus(perm.key)
                            const isSelected = selected?.id === perm.id
                            return (
                              <button
                                type='button'
                                key={perm.id}
                                onClick={() => setSelected(perm)}
                                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                                  isSelected ? 'bg-accent border-primary' : 'hover:bg-accent border-transparent'
                                }`}
                              >
                                <div className='flex items-start justify-between gap-2'>
                                  <div className='flex-1 min-w-0'>
                                    <div className='font-medium truncate'>{perm.name}</div>
                                    {perm.description && <div className='text-xs text-muted-foreground truncate'>{perm.description}</div>}
                                  </div>
                                  {status === 'custom-granted' && <ShieldCheck className='h-4 w-4 text-green-600 shrink-0' />}
                                  {status === 'custom-revoked' && <ShieldX className='h-4 w-4 text-red-600 shrink-0' />}
                                  {status === 'role-default' && rolePermissions.has(perm.key) && <Shield className='h-4 w-4 text-muted-foreground shrink-0' />}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Right — detail + actions */}
            <div className='border rounded-lg p-4 flex flex-col gap-4'>
              {selected ? (
                <>
                  <div className='flex flex-col gap-2'>
                    <h3 className='text-lg font-semibold'>{selected.name}</h3>
                    <Badge variant='outline' className='w-fit'>
                      {selected.key}
                    </Badge>
                    {selected.description && <p className='text-sm text-muted-foreground'>{selected.description}</p>}
                  </div>

                  <Separator />

                  <div className='flex flex-col gap-2'>
                    <Label>Current Status</Label>
                    <StatusBadge status={getStatus(selected.key)} />
                  </div>

                  <div className='flex flex-col gap-2'>
                    <Label htmlFor='reason'>Reason (Optional)</Label>
                    <Textarea
                      id='reason'
                      placeholder='Why are you granting/revoking this permission?'
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className='flex flex-col gap-2 mt-auto'>
                    <ActionButtons status={getStatus(selected.key)} busy={busy} onGrant={handleGrant} onRevoke={handleRevoke} onRemove={handleRemove} />
                  </div>
                </>
              ) : (
                <div className='flex items-center justify-center h-full text-muted-foreground'>
                  <div className='text-center'>
                    <Shield className='mx-auto h-12 w-12 mb-4 opacity-50' />
                    <p>Select a permission to manage</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// StatusBadge — identical to web app
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: PermissionStatus }) {
  if (status === 'custom-granted')
    return (
      <Badge variant='default' className='w-fit bg-green-600 hover:bg-green-700'>
        <ShieldCheck className='h-3 w-3 mr-1' />
        Custom Grant
      </Badge>
    )
  if (status === 'custom-revoked')
    return (
      <Badge variant='destructive' className='w-fit'>
        <ShieldX className='h-3 w-3 mr-1' />
        Custom Revoke
      </Badge>
    )
  return (
    <Badge variant='outline' className='w-fit'>
      <Shield className='h-3 w-3 mr-1' />
      Role Default
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// ActionButtons — identical to web app
// ---------------------------------------------------------------------------

function ActionButtons({
  status,
  busy,
  onGrant,
  onRevoke,
  onRemove,
}: {
  status: PermissionStatus
  busy: boolean
  onGrant: () => void
  onRevoke: () => void
  onRemove: () => void
}) {
  if (status === 'custom-granted')
    return (
      <>
        <Button onClick={onRemove} variant='outline' disabled={busy} className='w-full'>
          {busy ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <RotateCcw className='h-4 w-4 mr-2' />}
          Reset to Role Default
        </Button>
        <Button onClick={onRevoke} variant='destructive' disabled={busy} className='w-full'>
          {busy ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <ShieldX className='h-4 w-4 mr-2' />}
          Revoke Permission
        </Button>
      </>
    )
  if (status === 'custom-revoked')
    return (
      <>
        <Button onClick={onRemove} variant='outline' disabled={busy} className='w-full'>
          {busy ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <RotateCcw className='h-4 w-4 mr-2' />}
          Reset to Role Default
        </Button>
        <Button onClick={onGrant} disabled={busy} className='w-full'>
          {busy ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <ShieldCheck className='h-4 w-4 mr-2' />}
          Grant Permission
        </Button>
      </>
    )
  return (
    <>
      <Button onClick={onGrant} disabled={busy} className='w-full'>
        {busy ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <ShieldCheck className='h-4 w-4 mr-2' />}
        Grant Permission
      </Button>
      <Button onClick={onRevoke} variant='destructive' disabled={busy} className='w-full'>
        {busy ? <Loader2 className='h-4 w-4 mr-2 animate-spin' /> : <ShieldX className='h-4 w-4 mr-2' />}
        Revoke Permission
      </Button>
    </>
  )
}
