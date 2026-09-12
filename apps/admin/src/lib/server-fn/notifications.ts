/**
 * notifications.ts — Admin server functions for notification management
 */

import { prisma as rootPrisma } from '@platform/lib/prisma-client'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'

// ---------------------------------------------------------------------------
// In-app Notifications
// ---------------------------------------------------------------------------

export interface NotificationRow {
  id: string
  title: string
  message: string
  type: string
  priority: string
  isRead: boolean
  businessId: string
  businessName: string
  userId: string
  userName: string | null
  userEmail: string
  link: string | null
  createdAt: string
  archivedAt: string | null
}

export const listNotifications = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { search?: string; type?: string; page: number; pageSize: number }) => d)
  .handler(async ({ data }: any) => {
    const { search, type, page, pageSize } = data as {
      search?: string; type?: string; page: number; pageSize: number
    }
    const skip = (page - 1) * pageSize

    const where: any = {
      archivedAt: null,
      ...(type ? { type } : {}),
      ...(search?.trim()
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { message: { contains: search, mode: 'insensitive' } },
              { business: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      rootPrisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          business: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      }),
      rootPrisma.notification.count({ where }),
    ])

    return {
      total,
      rows: rows.map(n => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        priority: n.priority,
        isRead: n.isRead,
        businessId: n.businessId,
        businessName: n.business.name,
        userId: n.userId,
        userName: n.user.name,
        userEmail: n.user.email,
        link: n.link,
        createdAt: n.createdAt.toISOString(),
        archivedAt: n.archivedAt?.toISOString() ?? null,
      })) as NotificationRow[],
    }
  })

export const sendNotification = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: {
    businessId: string
    userId: string
    title: string
    message: string
    type: string
    priority: string
    link?: string
  }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.notification.create({
      data: {
        title: data.title,
        message: data.message,
        type: data.type as any,
        priority: data.priority as any,
        isRead: false,
        userId: data.userId,
        businessId: data.businessId,
        link: data.link ?? null,
        metadata: {},
      },
    })
    return { success: true, message: 'Notification sent.' }
  })

export const archiveNotification = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    await rootPrisma.notification.update({
      where: { id: data.id },
      data: { archivedAt: new Date() },
    })
    return { success: true }
  })

// ---------------------------------------------------------------------------
// Payment Notifications
// ---------------------------------------------------------------------------

export interface PaymentNotificationRow {
  id: string
  businessId: string
  businessName: string
  notificationType: string
  status: string
  scheduledFor: string
  sentAt: string | null
  title: string
  message: string
  planName: string | null
  amount: number
  billingPeriod: string
  failureReason: string | null
}

export const listPaymentNotifications = createServerFn({ method: 'POST' })
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
              { title: { contains: search, mode: 'insensitive' } },
              { business: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    }

    const [rows, total] = await Promise.all([
      rootPrisma.paymentNotification.findMany({
        where,
        orderBy: { scheduledFor: 'desc' },
        skip,
        take: pageSize,
        include: { business: { select: { name: true } } },
      }),
      rootPrisma.paymentNotification.count({ where }),
    ])

    return {
      total,
      rows: rows.map(n => ({
        id: n.id,
        businessId: n.businessId,
        businessName: n.business.name,
        notificationType: n.notificationType,
        status: n.status,
        scheduledFor: n.scheduledFor.toISOString(),
        sentAt: n.sentAt?.toISOString() ?? null,
        title: n.title,
        message: n.message,
        planName: n.planName,
        amount: n.amount,
        billingPeriod: n.billingPeriod,
        failureReason: n.failureReason,
      })) as PaymentNotificationRow[],
    }
  })

export const retryPaymentNotification = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    await rootPrisma.paymentNotification.update({
      where: { id: data.id },
      data: { status: 'SCHEDULED', scheduledFor: new Date(), failureReason: null },
    })
    return { success: true, message: 'Notification rescheduled.' }
  })

// ---------------------------------------------------------------------------
// Get business users (for send notification form)
// ---------------------------------------------------------------------------

export const getBusinessUsers = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { businessId: string }) => d)
  .handler(async ({ data }) => {
    const users = await rootPrisma.user.findMany({
      where: {
        memberships: { some: { businessId: data.businessId } },
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    return users
  })
