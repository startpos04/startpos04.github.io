/**
 * manual-payments.ts — Admin server functions for manual payment review
 *
 * Operates directly on rootPrisma (full unrestricted access).
 * All mutations require the caller to be authenticated (authMiddleware).
 * No tenant-scoped permission check — admin login is the guard.
 *
 * On APPROVE: mirrors the logic from web's review-manual-payment.ts
 *   - Updates payment status to SUCCEEDED
 *   - Applies advance credits to the BusinessSubscription
 *   - Activates subscription if not already ACTIVE
 *
 * On REJECT:
 *   - Updates payment status to FAILED with a rejection reason
 */

import { getServerContext } from '@platform/lib/better-auth/server-context'
import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ManualPaymentRow {
  id: string
  businessId: string
  businessName: string
  amount: number          // cents
  currency: string
  paymentMethod: string
  periodsAdvancePaid: number
  providerReference: string | null
  proofImageUrl: string | null
  notes: string | null
  subscriptionStatus: string | null
  createdAt: string
  status: string
}

// ---------------------------------------------------------------------------
// listPendingManualPayments
// ---------------------------------------------------------------------------

export const listPendingManualPayments = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<ManualPaymentRow[]> => {
    const payments = await rootPrisma.billingPayment.findMany({
      where: { provider: 'MANUAL', status: 'PENDING_APPROVAL' },
      include: {
        business: { select: { id: true, name: true } },
        subscription: { select: { status: true } },
      },
      orderBy: { createdAt: 'asc' }, // oldest first — FIFO queue
    })

    return payments.map(p => ({
      id: p.id,
      businessId: p.businessId,
      businessName: p.business?.name ?? '—',
      amount: p.amount,
      currency: p.currency,
      paymentMethod: p.paymentMethod,
      periodsAdvancePaid: p.periodsAdvancePaid,
      providerReference: p.providerReference,
      proofImageUrl: p.proofImageUrl,
      notes: p.notes,
      subscriptionStatus: p.subscription?.status ?? null,
      createdAt: p.createdAt.toISOString(),
      status: p.status,
    }))
  })

// ---------------------------------------------------------------------------
// approveManualPayment
// ---------------------------------------------------------------------------

export const approveManualPayment = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { paymentId: string }) => d)
  .handler(async ({ data, context }): Promise<{ success: boolean; message: string }> => {
    const caller = getServerContext(context).user
    const now = new Date()

    const payment = await rootPrisma.billingPayment.findUnique({
      where: { id: data.paymentId },
      include: {
        business: { select: { name: true } },
        subscription: true,
      },
    })

    if (!payment) return { success: false, message: 'Payment not found.' }
    if (payment.status !== 'PENDING_APPROVAL') {
      return { success: false, message: 'Payment has already been reviewed.' }
    }

    await rootPrisma.$transaction(async tx => {
      // 1. Mark payment SUCCEEDED
      await tx.billingPayment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCEEDED',
          approvedAt: now,
          approvedById: caller.id,
          syncStatus: 'NOT_REQUIRED',
        },
      })

      // 2. Apply advance credits to the subscription
      if (payment.subscriptionId) {
        const sub = await tx.businessSubscription.findUnique({
          where: { id: payment.subscriptionId },
        })
        if (sub) {
          const baseExpiry = sub.currentPeriodEnd ?? now
          const newExpiry = new Date(baseExpiry)
          newExpiry.setMonth(newExpiry.getMonth() + payment.periodsAdvancePaid)

          const currentCredits = sub.advancePaymentCredits ?? 0
          const newCredits = currentCredits + payment.periodsAdvancePaid

          await tx.businessSubscription.update({
            where: { id: payment.subscriptionId },
            data: {
              // Activate if not already active
              status: sub.status === 'TRIAL' || sub.status === 'ACTIVE' ? sub.status : 'ACTIVE',
              advancePaymentCredits: newCredits,
              advancePaymentExpiresAt: newExpiry,
              lastAdvancePaymentId: payment.id,
              lastAdvancePaymentAt: now,
            },
          })
        }
      }
    })

    const periods = payment.periodsAdvancePaid
    return {
      success: true,
      message: `Approved. ${periods} billing period${periods > 1 ? 's' : ''} credited to ${payment.business?.name ?? 'business'}.`,
    }
  })

// ---------------------------------------------------------------------------
// rejectManualPayment
// ---------------------------------------------------------------------------

export const rejectManualPayment = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { paymentId: string; reason?: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    const payment = await rootPrisma.billingPayment.findUnique({
      where: { id: data.paymentId },
      select: { status: true, business: { select: { name: true } } },
    })

    if (!payment) return { success: false, message: 'Payment not found.' }
    if (payment.status !== 'PENDING_APPROVAL') {
      return { success: false, message: 'Payment has already been reviewed.' }
    }

    await rootPrisma.billingPayment.update({
      where: { id: data.paymentId },
      data: {
        status: 'FAILED',
        rejectedAt: new Date(),
        rejectionReason: data.reason?.trim() || 'Rejected by admin.',
      },
    })

    return {
      success: true,
      message: `Rejected. ${payment.business?.name ?? 'Business'} will need to resubmit.`,
    }
  })
