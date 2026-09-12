/** biome-ignore-all lint/suspicious/noExplicitAny: column helper */

import { Avatar, AvatarFallback } from '@platform/components/ui/avatar'
import { Badge } from '@platform/components/ui/badge'
import dayjs from '@platform/lib/dayjs'
import type { ColumnHelper } from '@tanstack/react-table'
import { Calendar, ShieldCheck, ShieldX } from 'lucide-react'
import type { AdminAuditEntry } from '@/routes/(private)/(dashboard)/permissions/-audit'

export const auditCols = {
  action: (h: ColumnHelper<AdminAuditEntry>) =>
    h.accessor('type', {
      header: 'Action',
      cell: info => {
        const type = info.getValue()
        return (
          <div className='flex items-center gap-2'>
            {type === 'grant' ? (
              <>
                <div className='w-8 h-8 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center shrink-0'>
                  <ShieldCheck className='h-4 w-4 text-green-700 dark:text-green-400' />
                </div>
                <Badge variant='default' className='bg-green-600 hover:bg-green-700'>Granted</Badge>
              </>
            ) : type === 'revoke' ? (
              <>
                <div className='w-8 h-8 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0'>
                  <ShieldX className='h-4 w-4 text-red-700 dark:text-red-400' />
                </div>
                <Badge variant='destructive'>Revoked</Badge>
              </>
            ) : (
              <>
                <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0'>
                  <ShieldCheck className='h-4 w-4 text-blue-700 dark:text-blue-400' />
                </div>
                <Badge variant='outline' className='border-blue-600 text-blue-700 dark:text-blue-400'>Reset</Badge>
              </>
            )}
          </div>
        )
      },
    }),

  permission: (h: ColumnHelper<AdminAuditEntry>) =>
    h.accessor('permission', {
      header: 'Permission',
      cell: info => {
        const p = info.getValue()
        return (
          <div className='flex flex-col'>
            <span className='font-semibold text-foreground'>{p.name}</span>
            <div className='flex gap-1.5 mt-1'>
              <Badge variant='outline' className='text-[10px] py-0 h-4'>{p.scope}</Badge>
            </div>
          </div>
        )
      },
    }),

  user: (h: ColumnHelper<AdminAuditEntry>) =>
    h.accessor('user', {
      header: 'Admin User',
      cell: info => {
        const u = info.getValue()
        const initials = u.name
          ? u.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
          : u.email.slice(0, 2).toUpperCase()
        return (
          <div className='flex items-center gap-3'>
            <Avatar className='h-8 w-8'>
              <AvatarFallback className='text-xs'>{initials}</AvatarFallback>
            </Avatar>
            <div className='flex flex-col'>
              <span className='font-medium text-sm'>{u.name || u.email}</span>
              <Badge variant='outline' className='text-[10px] py-0 h-4 w-fit'>{u.role}</Badge>
            </div>
          </div>
        )
      },
    }),

  timestamp: (h: ColumnHelper<AdminAuditEntry>) =>
    h.accessor('actionAt', {
      header: 'When',
      cell: info => {
        const ts = info.getValue()
        if (!ts) return <span className='text-xs text-muted-foreground'>Unknown</span>
        return (
          <div className='flex items-center gap-2'>
            <Calendar className='h-4 w-4 text-muted-foreground shrink-0' />
            <div className='flex flex-col'>
              <span className='text-sm font-medium'>{dayjs(ts).fromNow()}</span>
              <span className='text-xs text-muted-foreground'>{dayjs(ts).format('MMM DD, YYYY h:mm A')}</span>
            </div>
          </div>
        )
      },
    }),

  reason: (h: ColumnHelper<AdminAuditEntry>) =>
    h.accessor('reason', {
      header: 'Reason',
      cell: info => {
        const r = info.getValue()
        return r
          ? <span className='text-sm text-muted-foreground line-clamp-2'>{r}</span>
          : <span className='text-xs text-muted-foreground italic'>No reason provided</span>
      },
    }),
}
