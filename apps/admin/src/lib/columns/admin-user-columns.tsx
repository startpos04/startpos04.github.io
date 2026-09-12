/** biome-ignore-all lint/suspicious/noExplicitAny: column helper */

import { WarningPrompt } from '@platform/components/custom/prompt/warning-prompt'
import { Avatar, AvatarFallback, AvatarImage } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import MountManager from '@platform/lib/mount-manager'
import type { ColumnHelper } from '@tanstack/react-table'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAdminUser } from '@/lib/server-fn/admin-accounts'

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  TESTER: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  SUPPORT: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  FINANCE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  DEVELOPER: 'bg-slate-100 text-slate-700 dark:bg-slate-950/40 dark:text-slate-400',
}

export const adminUserCols = {
  avatar: (h: ColumnHelper<any>) =>
    h.accessor('image', {
      header: 'Avatar',
      maxSize: 20,
      cell: info => {
        const user = info.row.original
        const initials = (user.name ?? user.email ?? '?')
          .split(' ')
          .map((w: string) => w[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
        return (
          <Avatar className='h-9 w-9 border border-border/50 shadow-sm'>
            <AvatarImage src={user.image ?? ''} alt={user.name} />
            <AvatarFallback className='bg-primary/5 text-primary text-xs font-bold'>
              {initials}
            </AvatarFallback>
          </Avatar>
        )
      },
    }),

  name: (h: ColumnHelper<any>) =>
    h.accessor('name', {
      header: 'Name',
      cell: info => (
        <span className='font-medium text-foreground'>{info.getValue()}</span>
      ),
    }),

  email: (h: ColumnHelper<any>) =>
    h.accessor('email', {
      header: 'Email',
      cell: info => (
        <span className='text-sm text-muted-foreground'>{info.getValue()}</span>
      ),
    }),

  role: (h: ColumnHelper<any>) =>
    h.accessor('role', {
      maxSize: 110,
      header: 'Role',
      cell: info => {
        const role = info.getValue() as string
        return (
          <Badge
            variant='outline'
            className={`text-xs ${ROLE_COLORS[role] ?? 'bg-muted text-muted-foreground'}`}
          >
            {role}
          </Badge>
        )
      },
    }),

  status: (h: ColumnHelper<any>) =>
    h.accessor('emailVerified', {
      maxSize: 90,
      header: 'Verified',
      cell: info =>
        info.getValue() ? (
          <Badge variant='outline' className='text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800'>
            Verified
          </Badge>
        ) : (
          <Badge variant='outline' className='text-xs text-muted-foreground'>
            Unverified
          </Badge>
        ),
    }),

  deleteAction: (h: ColumnHelper<any>, onDeleted?: () => void) =>
    h.display({
      maxSize: 60,
      id: 'actions',
      header: () => <div className='text-right pr-4'>Actions</div>,
      cell: ({ row }) => {
        const handleDelete = () => {
          MountManager.show(WarningPrompt, {
            title: 'Delete Admin Account',
            description: `Are you sure you want to delete "${row.original.name}"? They will lose all access to the admin panel.`,
            onConfirm: async () => {
              try {
                const result = await deleteAdminUser({ data: { id: row.original.id } })
                if (!result.success) {
                  toast.error((result as { error: string }).error)
                  return false
                }
                toast.success('Account deleted.')
                onDeleted?.()
                return true
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to delete account.')
                return false
              }
            },
          })
        }

        return (
          <div className='flex justify-end pr-2'>
            <Button
              variant='ghost'
              size='icon'
              className='rounded-full text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={e => {
                e.stopPropagation()
                handleDelete()
              }}
            >
              <Trash2 className='size-4' />
            </Button>
          </div>
        )
      },
    }),
}
