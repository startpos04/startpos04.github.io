/** biome-ignore-all lint/suspicious/noExplicitAny: column helper */

import { Badge } from '@platform/components/ui/badge'
import type { ColumnHelper } from '@tanstack/react-table'
import { Shield, ShieldCheck, Users } from 'lucide-react'
import type { AdminPermissionWithUsers } from '@/lib/permissions/permission-management'

export const permissionCols = {
  name: (h: ColumnHelper<AdminPermissionWithUsers>) =>
    h.accessor('name', {
      header: 'Permission Name',
      cell: info => (
        <div className='flex items-center gap-2'>
          <Shield className='h-4 w-4 text-primary shrink-0' />
          <span className='font-semibold text-foreground'>{info.getValue()}</span>
        </div>
      ),
    }),

  description: (h: ColumnHelper<AdminPermissionWithUsers>) =>
    h.accessor('description', {
      header: 'Description',
      cell: info => {
        const v = info.getValue()
        return v
          ? <span className='text-sm text-muted-foreground'>{v}</span>
          : <span className='text-xs text-muted-foreground italic'>No description</span>
      },
    }),

  scope: (h: ColumnHelper<AdminPermissionWithUsers>) =>
    h.accessor('scope', {
      header: 'Scope',
      cell: info => <Badge variant='secondary' className='text-xs'>{info.getValue()}</Badge>,
    }),

  category: (h: ColumnHelper<AdminPermissionWithUsers>) =>
    h.accessor('category', {
      header: 'Category',
      cell: info => {
        const v = info.getValue()
        return v
          ? <Badge variant='outline' className='text-xs'>{v}</Badge>
          : <span className='text-xs text-muted-foreground'>-</span>
      },
    }),

  users: (h: ColumnHelper<AdminPermissionWithUsers>) =>
    h.display({
      id: 'users',
      header: () => (
        <div className='flex items-center gap-2'>
          <Users className='h-4 w-4' />
          <span>Custom Assignments</span>
        </div>
      ),
      cell: info => {
        const perm = info.row.original
        const grants = perm.usersWithGrant.length
        const revokes = perm.usersWithRevoke.length
        return (
          <div className='flex items-center gap-2'>
            {grants > 0 && (
              <Badge className='gap-1 bg-green-600 hover:bg-green-700'>
                <ShieldCheck className='h-3 w-3' />
                {grants} {grants === 1 ? 'Grant' : 'Grants'}
              </Badge>
            )}
            {revokes > 0 && (
              <Badge variant='destructive' className='gap-1'>
                <Shield className='h-3 w-3' />
                {revokes} {revokes === 1 ? 'Revoke' : 'Revokes'}
              </Badge>
            )}
            {grants === 0 && revokes === 0 && (
              <Badge variant='outline' className='gap-1 text-muted-foreground'>
                <Shield className='h-3 w-3' />
                No custom assignments
              </Badge>
            )}
          </div>
        )
      },
    }),
}
