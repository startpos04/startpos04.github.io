/** biome-ignore-all lint/suspicious/noExplicitAny: TODO: fix */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
// import dayjs from '@platform/lib/dayjs'
import { cn } from '@platform/lib/utils'
import type { ColumnHelper } from '@tanstack/react-table'
import { PriceEngine } from '@/lib/conversion/price-engine'

export const invoiceCols = {
  invoiceNumber: (h: ColumnHelper<any>) =>
    h.accessor('externalInvoiceId', {
      header: 'Invoice #',
      cell: info => {
        const id = info.getValue()
        // Show the Stripe invoice ID if available, otherwise fall back to the row id
        const label = id ?? `INV-${info.row.original.id.slice(-6).toUpperCase()}`
        return <span className='font-medium text-sm font-mono'>{label}</span>
      },
    }),

  description: (h: ColumnHelper<any>) =>
    h.display({
      id: 'description',
      header: 'Period',
      cell: ({ row }) => {
        const start = new Date(row.original.billingPeriodStart)
        const end = new Date(row.original.billingPeriodEnd)
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        return (
          <span className='text-sm text-muted-foreground'>
            {fmt(start)} – {fmt(end)}
          </span>
        )
      },
    }),

  invoiceDate: (h: ColumnHelper<any>) =>
    h.accessor('billingPeriodStart', {
      header: 'Date',
      cell: info => {
        const date = new Date(info.getValue())
        return (
          <div className='font-medium text-sm'>
            {date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
        )
      },
    }),

  dueDate: (h: ColumnHelper<any>) =>
    h.accessor('dueAt', {
      header: 'Due Date',
      cell: info => {
        const val = info.getValue()
        if (!val) return <span className='text-sm text-muted-foreground'>—</span>
        const date = new Date(val)
        return (
          <span className='text-sm'>
            {date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        )
      },
    }),

  invoiceStatus: (h: ColumnHelper<any>) =>
    h.accessor('status', {
      header: 'Status',
      cell: info => {
        const status = info.getValue() as string
        const isPaid = status === 'PAID'
        const isOpen = status === 'OPEN' || status === 'DRAFT'
        return (
          <div className='flex items-center gap-2'>
            <div className={cn('w-2 h-2 rounded-full', isPaid ? 'bg-emerald-500' : isOpen ? 'bg-amber-500' : 'bg-red-500')} />
            <Badge variant={isPaid ? 'default' : isOpen ? 'secondary' : 'destructive'} className='text-xs capitalize'>
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Badge>
          </div>
        )
      },
    }),

  invoiceAmount: (h: ColumnHelper<any>) =>
    h.accessor('totalAmount', {
      header: 'Amount',
      cell: info => {
        const amount = info.getValue()
        return (
          <div className='text-right'>
            <span className='font-medium'>{PriceEngine.format(amount)}</span>
          </div>
        )
      },
    }),

  downloadAction: (h: ColumnHelper<any>) =>
    h.display({
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const url = row.original.hostedInvoiceUrl ?? row.original.pdfUrl
        return (
          <div className='text-right'>
            <Button variant='ghost' size='sm' className='h-7 px-2 text-xs' disabled={!url} onClick={() => url && window.open(url, '_blank')}>
              {url ? 'View' : '—'}
            </Button>
          </div>
        )
      },
    }),

  // Billing/Credit History specific columns
  dateWithTime: (h: ColumnHelper<any>) =>
    h.accessor('createdAt', {
      header: 'Date',
      cell: info => {
        const date = new Date(info.getValue())
        return (
          <div>
            <div className='font-medium text-sm'>
              {date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
            <div className='text-xs text-muted-foreground'>
              {date.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
        )
      },
    }),

  creditEventType: (h: ColumnHelper<any>) =>
    h.accessor('eventType', {
      header: 'Type',
      cell: info => {
        const eventType = info.getValue()
        return (
          <div className='flex items-center gap-2'>
            <div className={cn('w-2 h-2 rounded-full', eventType === 'PURCHASE' ? 'bg-emerald-500' : 'bg-red-500')} />
            <Badge variant={eventType === 'PURCHASE' ? 'default' : 'secondary'} className='text-xs'>
              {eventType === 'PURCHASE' ? 'Purchase' : 'Usage'}
            </Badge>
          </div>
        )
      },
    }),

  creditDescription: (h: ColumnHelper<any>) =>
    h.display({
      id: 'description',
      header: 'Description',
      cell: ({ row }) => {
        const eventType = row.original.eventType
        return (
          <div>
            <p className='text-sm'>{eventType === 'PURCHASE' ? 'Credit package purchased' : 'Credit used for overflow transaction'}</p>
            {row.original.reference && <p className='text-xs text-muted-foreground'>Ref: {row.original.reference}</p>}
          </div>
        )
      },
    }),

  creditAmount: (h: ColumnHelper<any>) =>
    h.accessor('amount', {
      header: 'Amount',
      cell: info => {
        const amount = info.getValue()
        return (
          <div className='text-right'>
            <span className={cn('font-medium', amount > 0 ? 'text-emerald-600' : 'text-red-600')}>
              {amount > 0 ? '+' : ''}
              {amount}
            </span>
          </div>
        )
      },
    }),

  creditBalanceAfter: (h: ColumnHelper<any>) =>
    h.accessor('balanceAfter', {
      header: 'Balance After',
      cell: info => <div className='text-right font-medium'>{info.getValue()}</div>,
    }),
}
