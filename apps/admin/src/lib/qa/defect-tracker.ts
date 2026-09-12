/**
 * defect-tracker.ts
 *
 * Server functions for the QA defect lifecycle:
 *   listDefects     — paginated/filtered list for the defect list page
 *   getDefect       — single defect with full run context
 *   updateDefectStatus — OPEN → INVESTIGATING → FIXED → RETEST_REQUIRED → RESOLVED / WONT_FIX
 */

import { getServerContext } from '@platform/lib/better-auth/server-context'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type DefectStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'FIXED'
  | 'RETEST_REQUIRED'
  | 'RETEST_FAILED'
  | 'RESOLVED'
  | 'WONT_FIX'

export type DefectPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface DefectRow {
  id: string
  testCaseId: string
  runId: string
  title: string
  description: string
  status: DefectStatus
  priority: DefectPriority
  buildFound: string | null
  buildFixed: string | null
  fixNote: string | null
  resolvedAt: string | null
  retestRunId: string | null
  createdAt: string
  updatedAt: string
  /** Tester name snapshot from the run */
  testerName: string | null
}

export interface DefectDetail extends DefectRow {
  /** Full run record for context */
  run: {
    runId: string
    testCaseId: string
    testerName: string
    testerEmail: string
    buildRef: string | null
    environment: string
    startedAt: string
    completedAt: string | null
  } | null
}

// ---------------------------------------------------------------------------
// Valid status transitions
// ---------------------------------------------------------------------------

const ALLOWED_TRANSITIONS: Record<DefectStatus, DefectStatus[]> = {
  OPEN: ['INVESTIGATING', 'WONT_FIX'],
  INVESTIGATING: ['FIXED', 'WONT_FIX'],
  FIXED: ['RETEST_REQUIRED'],
  RETEST_REQUIRED: ['RETEST_FAILED', 'RESOLVED'],
  RETEST_FAILED: ['INVESTIGATING', 'WONT_FIX'],
  RESOLVED: [],
  WONT_FIX: [],
}

export function canTransition(from: DefectStatus, to: DefectStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

export function allowedNextStatuses(current: DefectStatus): DefectStatus[] {
  return ALLOWED_TRANSITIONS[current] ?? []
}

// ---------------------------------------------------------------------------
// listDefects
// ---------------------------------------------------------------------------

export const listDefects = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((d: {
    status?: DefectStatus
    priority?: DefectPriority
    testCaseId?: string
    limit?: number
    offset?: number
  }) => d)
  .handler(async ({ data }): Promise<{ defects: DefectRow[]; total: number }> => {
    const where = {
      ...(data.status ? { status: data.status } : {}),
      ...(data.priority ? { priority: data.priority } : {}),
      ...(data.testCaseId ? { testCaseId: data.testCaseId } : {}),
    }

    const [defects, total] = await Promise.all([
      rootPrisma.qaDefect.findMany({
        where,
        orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
        take: data.limit ?? 100,
        skip: data.offset ?? 0,
      }),
      rootPrisma.qaDefect.count({ where }),
    ])

    // Fetch tester names from runs
    const runIds = [...new Set(defects.map(d => d.runId))]
    const runs = await rootPrisma.qaTestRun.findMany({
      where: { id: { in: runIds } },
      select: { id: true, testerName: true },
    })
    const runMap = new Map(runs.map(r => [r.id, r.testerName]))

    return {
      total,
      defects: defects.map(d => ({
        id: d.id,
        testCaseId: d.testCaseId,
        runId: d.runId,
        title: d.title,
        description: d.description,
        status: d.status as DefectStatus,
        priority: d.priority as DefectPriority,
        buildFound: d.buildFound,
        buildFixed: d.buildFixed,
        fixNote: d.fixNote,
        resolvedAt: d.resolvedAt?.toISOString() ?? null,
        retestRunId: d.retestRunId,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
        testerName: runMap.get(d.runId) ?? null,
      })),
    }
  })

// ---------------------------------------------------------------------------
// getDefect
// ---------------------------------------------------------------------------

export const getDefect = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((d: { defectId: string }) => d)
  .handler(async ({ data }): Promise<DefectDetail | null> => {
    const defect = await rootPrisma.qaDefect.findUnique({
      where: { id: data.defectId },
    })
    if (!defect) return null

    const run = await rootPrisma.qaTestRun.findUnique({
      where: { id: defect.runId },
      select: {
        id: true,
        testCaseId: true,
        testerName: true,
        testerEmail: true,
        buildRef: true,
        environment: true,
        startedAt: true,
        completedAt: true,
      },
    })

    return {
      id: defect.id,
      testCaseId: defect.testCaseId,
      runId: defect.runId,
      title: defect.title,
      description: defect.description,
      status: defect.status as DefectStatus,
      priority: defect.priority as DefectPriority,
      buildFound: defect.buildFound,
      buildFixed: defect.buildFixed,
      fixNote: defect.fixNote,
      resolvedAt: defect.resolvedAt?.toISOString() ?? null,
      retestRunId: defect.retestRunId,
      createdAt: defect.createdAt.toISOString(),
      updatedAt: defect.updatedAt.toISOString(),
      testerName: run?.testerName ?? null,
      run: run
        ? {
            runId: run.id,
            testCaseId: run.testCaseId,
            testerName: run.testerName,
            testerEmail: run.testerEmail,
            buildRef: run.buildRef,
            environment: run.environment,
            startedAt: run.startedAt.toISOString(),
            completedAt: run.completedAt?.toISOString() ?? null,
          }
        : null,
    }
  })

// ---------------------------------------------------------------------------
// updateDefectStatus
// ---------------------------------------------------------------------------

export const updateDefectStatus = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: {
    defectId: string
    newStatus: DefectStatus
    fixNote?: string
    buildFixed?: string
  }) => d)
  .handler(async ({ data, context }) => {
    const ctx = getServerContext(context)

    const defect = await rootPrisma.qaDefect.findUnique({
      where: { id: data.defectId },
      select: { id: true, status: true },
    })

    if (!defect) return { ok: false as const, error: 'Defect not found.' }

    if (!canTransition(defect.status as DefectStatus, data.newStatus)) {
      return {
        ok: false as const,
        error: `Cannot transition from ${defect.status} to ${data.newStatus}.`,
      }
    }

    const now = new Date()
    const isResolved = data.newStatus === 'RESOLVED' || data.newStatus === 'WONT_FIX'

    await rootPrisma.qaDefect.update({
      where: { id: data.defectId },
      data: {
        status: data.newStatus,
        ...(data.fixNote ? { fixNote: data.fixNote } : {}),
        ...(data.buildFixed ? { buildFixed: data.buildFixed } : {}),
        ...(isResolved ? { resolvedAt: now } : {}),
      },
    })

    // When marking RETEST_REQUIRED, mark the QaConditionState as invalidated
    // so the test will show as needing re-run
    if (data.newStatus === 'RETEST_REQUIRED') {
      const run = await rootPrisma.qaTestRun.findUnique({
        where: { id: defect.id },
        select: { testCaseId: true },
      })
      if (run) {
        // We don't have the establishes list here, but we can invalidate
        // conditions established by any PASSED run for this test
        const passedRun = await rootPrisma.qaTestRun.findFirst({
          where: { testCaseId: run.testCaseId, status: 'COMPLETED' },
          include: { result: { select: { statesEstablished: true } } },
          orderBy: { completedAt: 'desc' },
        })
        if (passedRun?.result?.statesEstablished?.length) {
          await rootPrisma.qaConditionState.updateMany({
            where: { conditionId: { in: passedRun.result.statesEstablished } },
            data: { invalidatedAt: now },
          })
        }
      }
    }

    console.info(
      `[defect-tracker] Defect ${data.defectId} transitioned to ${data.newStatus} by ${ctx.user.id}`,
    )

    return { ok: true as const, newStatus: data.newStatus }
  })

// ---------------------------------------------------------------------------
// getOpenDefectsByTestCase — used by campaign detail to show defect badges
// ---------------------------------------------------------------------------

export const getOpenDefectsByTestCase = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<Record<string, DefectRow>> => {
    const openStatuses = ['OPEN', 'INVESTIGATING', 'FIXED', 'RETEST_REQUIRED', 'RETEST_FAILED']
    const defects = await rootPrisma.qaDefect.findMany({
      where: { status: { in: openStatuses } },
      orderBy: { createdAt: 'desc' },
    })

    // Keep only the most recent active defect per testCaseId
    const result: Record<string, DefectRow> = {}
    for (const d of defects) {
      if (!result[d.testCaseId]) {
        result[d.testCaseId] = {
          id: d.id,
          testCaseId: d.testCaseId,
          runId: d.runId,
          title: d.title,
          description: d.description,
          status: d.status as DefectStatus,
          priority: d.priority as DefectPriority,
          buildFound: d.buildFound,
          buildFixed: d.buildFixed,
          fixNote: d.fixNote,
          resolvedAt: d.resolvedAt?.toISOString() ?? null,
          retestRunId: d.retestRunId,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
          testerName: null,
        }
      }
    }
    return result
  })
