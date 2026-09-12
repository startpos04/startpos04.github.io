/**
 * subscriptions.ts — Admin server functions for subscription management
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

export interface SubscriptionRow {
  id: string
  businessId: string
  businessName: string
  businessLogo: string | null
  status: string
  planId: string
  planName: string | null
  billingModel: string
  monthlyPrice: number // cents
  trialEndsAt: string | null
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
  gracePeriodEndsAt: string | null
  txUsedThisPeriod: number
  advancePaymentCredits: number
  advancePaymentExpiresAt: string | null
  externalId: string | null
  cancelReason: string | null
  createdAt: string
}

export interface PlanOption {
  id: string
  name: string
  monthlyPrice: number
  includedTxPerMonth: number
}

// ---------------------------------------------------------------------------
// listSubscriptions — paginated, searchable, filterable by status
// ---------------------------------------------------------------------------

export const listSubscriptions = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { search?: string; status?: string; page: number; pageSize: number }) => d)
  .handler(async ({ data }: any) => {
    const { search, status, page, pageSize } = data as {
      search?: string
      status?: string
      page: number
      pageSize: number
    }
    const skip = (page - 1) * pageSize

    const where: any = {
      business: { deletedAt: null },
      ...(status ? { status } : {}),
      ...(search?.trim() ? { business: { name: { contains: search, mode: 'insensitive' } } } : {}),
    }

    const [subs, total] = await Promise.all([
      rootPrisma.businessSubscription.findMany({
        where,
        orderBy: { business: { name: 'asc' } },
        skip,
        take: pageSize,
        include: {
          business: { select: { id: true, name: true, logo: true } },
          plan: { select: { id: true, name: true, monthlyPrice: true } },
        },
      }),
      rootPrisma.businessSubscription.count({ where }),
    ])

    const rows: SubscriptionRow[] = subs.map(s => ({
      id: s.id,
      businessId: s.businessId,
      businessName: s.business.name,
      businessLogo: s.business.logo,
      status: s.status,
      planId: s.planId,
      planName: s.plan.name,
      billingModel: s.billingModel,
      monthlyPrice: s.plan.monthlyPrice,
      trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
      currentPeriodStart: s.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: s.currentPeriodEnd?.toISOString() ?? null,
      gracePeriodEndsAt: s.gracePeriodEndsAt?.toISOString() ?? null,
      txUsedThisPeriod: s.txUsedThisPeriod,
      advancePaymentCredits: s.advancePaymentCredits,
      advancePaymentExpiresAt: s.advancePaymentExpiresAt?.toISOString() ?? null,
      externalId: s.externalId,
      cancelReason: s.cancelReason,
      createdAt: (s as any).createdAt?.toISOString() ?? '',
    }))

    return { rows, total }
  })

// ---------------------------------------------------------------------------
// listPlans — for the plan picker in the sidebar
// ---------------------------------------------------------------------------

export const listPlans = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<PlanOption[]> => {
    const plans = await rootPrisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: { id: true, name: true, monthlyPrice: true, includedTxPerMonth: true },
      orderBy: { sortOrder: 'asc' },
    })
    return plans
  })

// ---------------------------------------------------------------------------
// changePlan
// ---------------------------------------------------------------------------

export const changePlan = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { subscriptionId: string; planId: string }) => d)
  .handler(async ({ data }) => {
    const plan = await rootPrisma.subscriptionPlan.findUnique({
      where: { id: data.planId },
      select: { id: true, name: true },
    })
    if (!plan) return { success: false, message: 'Plan not found.' }

    await rootPrisma.businessSubscription.update({
      where: { id: data.subscriptionId },
      data: { planId: data.planId },
    })

    return { success: true, message: `Plan changed to ${plan.name}.` }
  })

// ---------------------------------------------------------------------------
// changeStatus — activate, expire, cancel, suspend, unsuspend
// ---------------------------------------------------------------------------

export const changeStatus = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { subscriptionId: string; status: string; reason?: string }) => d)
  .handler(async ({ data }: any) => {
    const update: any = { status: data.status }
    if (data.status === 'CANCELLED' && data.reason) update.cancelReason = data.reason
    if (data.status === 'SUSPENDED') update.suspendedAt = new Date()
    if (data.status === 'ACTIVE') {
      update.suspendedAt = null
      update.cancelReason = null
    }

    await rootPrisma.businessSubscription.update({
      where: { id: data.subscriptionId },
      data: update,
    })

    return { success: true, message: `Status changed to ${data.status}.` }
  })

// ---------------------------------------------------------------------------
// addCredits — add advance payment credit periods
// ---------------------------------------------------------------------------

export const addCredits = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { subscriptionId: string; periods: number }) => d)
  .handler(async ({ data }) => {
    const sub = await rootPrisma.businessSubscription.findUnique({
      where: { id: data.subscriptionId },
      select: { advancePaymentCredits: true, currentPeriodEnd: true },
    })
    if (!sub) return { success: false, message: 'Subscription not found.' }

    const newCredits = sub.advancePaymentCredits + data.periods
    const base = sub.currentPeriodEnd ?? new Date()
    const newExpiry = new Date(base)
    newExpiry.setMonth(newExpiry.getMonth() + data.periods)

    await rootPrisma.businessSubscription.update({
      where: { id: data.subscriptionId },
      data: {
        advancePaymentCredits: newCredits,
        advancePaymentExpiresAt: newExpiry,
      },
    })

    return {
      success: true,
      message: `Added ${data.periods} period${data.periods > 1 ? 's' : ''}. Total: ${newCredits}.`,
    }
  })

// ---------------------------------------------------------------------------
// extendTrial — push trialEndsAt forward
// ---------------------------------------------------------------------------

export const extendTrial = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { subscriptionId: string; days: number }) => d)
  .handler(async ({ data }) => {
    const sub = await rootPrisma.businessSubscription.findUnique({
      where: { id: data.subscriptionId },
      select: { trialEndsAt: true, status: true },
    })
    if (!sub) return { success: false, message: 'Subscription not found.' }

    const base = sub.trialEndsAt ?? new Date()
    const newDate = new Date(base)
    newDate.setDate(newDate.getDate() + data.days)

    await rootPrisma.businessSubscription.update({
      where: { id: data.subscriptionId },
      data: {
        trialEndsAt: newDate,
        status: 'TRIAL', // Restore trial status if it had expired
      },
    })

    return { success: true, message: `Trial extended by ${data.days} days.` }
  })
