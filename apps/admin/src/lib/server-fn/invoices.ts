/**
 * invoices.ts — Admin server functions for billing invoice viewer
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

export interface InvoiceRow {
  id: string
  businessId: string
  businessName: string
  status: string
  subtotalAmount: number
  taxAmount: number
  totalAmount: number
  billingPeriodStart: string
  billingPeriodEnd: string
  externalInvoiceId: string | null
  providerName: string | null
  dueAt: string | null
  paidAt: string | null
  createdAt: string
  itemCount: number
  paymentCount: number
}

export interface InvoiceDetail extends InvoiceRow {
  items: Array<{
    id: string
    type: string
    description: string
    quantity: number
    unitAmount: number
    lineAmount: number
  }>
  payments: Array<{
    id: string
    provider: string
    paymentMethod: string
    amount: number
    status: string
    createdAt: string
  }>
}

export const listInvoices = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { search?: string; status?: string; page: number; pageSize: number }) => d)
  .handler(async ({ data }: any) => {
    const { search, status, page, pageSize } = data as {
      search?: string; status?: string; page: number; pageSize: number
    }
    const skip = (page - 1) * pageSize

    const where: any = {
      ...(status ? { status } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { business: { name: { contains: search, mode: 'insensitive' } } },
              { externalInvoiceId: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [invoices, total] = await Promise.all([
      rootPrisma.billingInvoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          business: { select: { name: true } },
          _count: { select: { items: true, billingPayments: true } },
        },
      }),
      rootPrisma.billingInvoice.count({ where }),
    ])

    return {
      total,
      rows: invoices.map(inv => ({
        id: inv.id,
        businessId: inv.businessId,
        businessName: inv.business.name,
        status: inv.status,
        subtotalAmount: inv.subtotalAmount,
        taxAmount: inv.taxAmount,
        totalAmount: inv.totalAmount,
        billingPeriodStart: inv.billingPeriodStart.toISOString(),
        billingPeriodEnd: inv.billingPeriodEnd.toISOString(),
        externalInvoiceId: inv.externalInvoiceId,
        providerName: inv.providerName,
        dueAt: inv.dueAt?.toISOString() ?? null,
        paidAt: inv.paidAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
        itemCount: inv._count.items,
        paymentCount: inv._count.billingPayments,
      })) as InvoiceRow[],
    }
  })

export const getInvoiceDetail = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { invoiceId: string }) => d)
  .handler(async ({ data }): Promise<InvoiceDetail | null> => {
    const inv = await rootPrisma.billingInvoice.findUnique({
      where: { id: data.invoiceId },
      include: {
        business: { select: { name: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, type: true, description: true, quantity: true, unitAmount: true, lineAmount: true },
        },
        billingPayments: {
          select: { id: true, provider: true, paymentMethod: true, amount: true, status: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { items: true, billingPayments: true } },
      },
    })
    if (!inv) return null

    return {
      id: inv.id,
      businessId: inv.businessId,
      businessName: inv.business.name,
      status: inv.status,
      subtotalAmount: inv.subtotalAmount,
      taxAmount: inv.taxAmount,
      totalAmount: inv.totalAmount,
      billingPeriodStart: inv.billingPeriodStart.toISOString(),
      billingPeriodEnd: inv.billingPeriodEnd.toISOString(),
      externalInvoiceId: inv.externalInvoiceId,
      providerName: inv.providerName,
      dueAt: inv.dueAt?.toISOString() ?? null,
      paidAt: inv.paidAt?.toISOString() ?? null,
      createdAt: inv.createdAt.toISOString(),
      itemCount: inv._count.items,
      paymentCount: inv._count.billingPayments,
      items: inv.items.map(i => ({
        id: i.id,
        type: i.type,
        description: i.description,
        quantity: i.quantity,
        unitAmount: i.unitAmount,
        lineAmount: i.lineAmount,
      })),
      payments: inv.billingPayments.map(p => ({
        id: p.id,
        provider: p.provider,
        paymentMethod: p.paymentMethod,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    }
  })

export const updateInvoiceStatus = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { invoiceId: string; status: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.billingInvoice.update({
      where: { id: data.invoiceId },
      data: {
        status: data.status as any,
        ...(data.status === 'PAID' ? { paidAt: new Date() } : {}),
      },
    })
    return { success: true, message: `Invoice marked as ${data.status}.` }
  })
