/**
 * businesses.ts — Admin server functions for business management
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

export interface BusinessRow {
  id: string
  name: string
  slug: string
  logo: string | null
  businessType: string
  countryCode: string
  registrationStatus: string
  createdAt: string
  // subscription snapshot
  subscriptionId: string | null
  subscriptionStatus: string | null
  planName: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  advancePaymentCredits: number
  // usage
  branchCount: number
  memberCount: number
  txUsedThisPeriod: number
}

export const fetchBusinesses = createServerFn({ method: 'POST' })
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
      deletedAt: null,
      ...(status ? { subscription: { status } } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const [businesses, total] = await Promise.all([
      rootPrisma.business.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: pageSize,
        include: {
          subscription: {
            include: { plan: { select: { name: true } } },
          },
          _count: {
            select: { branches: true, members: true },
          },
        },
      }),
      rootPrisma.business.count({ where }),
    ])

    const rows: BusinessRow[] = businesses.map(b => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      logo: b.logo,
      businessType: b.businessType,
      countryCode: b.countryCode,
      registrationStatus: b.registrationStatus,
      createdAt: (b as any).createdAt?.toISOString() ?? '',
      subscriptionId: b.subscription?.id ?? null,
      subscriptionStatus: b.subscription?.status ?? null,
      planName: b.subscription?.plan?.name ?? null,
      trialEndsAt: b.subscription?.trialEndsAt?.toISOString() ?? null,
      currentPeriodEnd: b.subscription?.currentPeriodEnd?.toISOString() ?? null,
      advancePaymentCredits: b.subscription?.advancePaymentCredits ?? 0,
      branchCount: b._count.branches,
      memberCount: b._count.members,
      txUsedThisPeriod: b.subscription?.txUsedThisPeriod ?? 0,
    }))

    return { rows, total }
  })

export const suspendBusiness = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data }) => {
    const sub = await rootPrisma.businessSubscription.findUnique({
      where: { businessId: data.businessId },
      select: { id: true },
    })
    if (!sub) return { success: false, message: 'No subscription found.' }

    await rootPrisma.businessSubscription.update({
      where: { id: sub.id },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    })
    return { success: true, message: 'Business suspended.' }
  })

export const unsuspendBusiness = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data }) => {
    const sub = await rootPrisma.businessSubscription.findUnique({
      where: { businessId: data.businessId },
      select: { id: true, status: true },
    })
    if (!sub) return { success: false, message: 'No subscription found.' }

    await rootPrisma.businessSubscription.update({
      where: { id: sub.id },
      data: { status: 'ACTIVE', suspendedAt: null },
    })
    return { success: true, message: 'Business reactivated.' }
  })
