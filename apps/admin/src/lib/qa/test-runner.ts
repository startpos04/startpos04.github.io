/**
 * test-runner.ts
 *
 * Server functions for the QA test execution lifecycle:
 *   startRun   — creates a QaTestRun with status IN_PROGRESS
 *   completeRun — marks the run COMPLETED, records QaTestResult, creates QaDefect on FAILED
 *   abandonRun  — marks a run ABANDONED (tester navigated away)
 *
 * Also exports getRecentRuns for the test list UI.
 */

import { buildSummaryFromDatabase } from '@platform/lib/authorization/authorization-engine.server'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { getServerContext } from '@platform/lib/better-auth/server-context'
import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'
import type { CompleteRunResult, QaTestCase, StartRunResult } from './types'

// ---------------------------------------------------------------------------
// startRun
// ---------------------------------------------------------------------------

export const startRun = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { testCase: QaTestCase; campaignId?: string; buildRef?: string }) => d)
  .handler(async ({ data, context }): Promise<StartRunResult> => {
    const ctx = getServerContext(context)
    const user = ctx.user

    // Enforce assignment rules:
    // - If a test has been assigned to someone, ONLY that person can run it.
    // - If a test has no assignment, only users with QA_ASSIGN_TEST (SUPERADMIN) can run it.
    const summary = await buildSummaryFromDatabase({ userId: user.id, role: (user as { role?: string }).role ?? '' })
    const canRun = summary.permissions.includes(Permissions.QA_RUN_TEST)
    const canAssign = summary.permissions.includes(Permissions.QA_ASSIGN_TEST)

    if (!canRun) {
      throw new Error('You do not have permission to run QA tests.')
    }

    const assignment = await rootPrisma.qaTestAssignment.findFirst({
      where: { testCaseId: data.testCase.id },
      select: { assigneeId: true, assigneeName: true },
    })

    if (assignment) {
      // Test is assigned — only the assigned person may run it
      if (assignment.assigneeId !== user.id) {
        throw new Error(`This test is assigned to ${assignment.assigneeName}. Only they can run it.`)
      }
    } else {
      // Test is unassigned — only SUPERADMIN (QA_ASSIGN_TEST) may run it
      if (!canAssign) {
        throw new Error('This test is not assigned to anyone. Ask a SUPERADMIN to assign it to you.')
      }
    }

    // Abandon any existing IN_PROGRESS run for the same test by this tester
    await rootPrisma.qaTestRun.updateMany({
      where: {
        testCaseId: data.testCase.id,
        testerId: user.id,
        status: 'IN_PROGRESS',
      },
      data: { status: 'ABANDONED' },
    })

    const run = await rootPrisma.qaTestRun.create({
      data: {
        testCaseId: data.testCase.id,
        campaignId: data.campaignId ?? null,
        testerId: user.id as string,
        testerName: (user['name'] as string | null) ?? (user['email'] as string | null) ?? 'Unknown',
        testerEmail: (user['email'] as string | null) ?? '',
        status: 'IN_PROGRESS',
        buildRef: data.buildRef ?? process.env['BUILD_REF'] ?? null,
        environment: process.env['QA_ENVIRONMENT'] ?? 'qa',
      },
    })

    return {
      runId: run.id,
      testCaseId: run.testCaseId,
      startedAt: run.startedAt.toISOString(),
    }
  })

// ---------------------------------------------------------------------------
// completeRun
// ---------------------------------------------------------------------------

export const completeRun = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator(
    (d: { runId: string; testCase: QaTestCase; outcome: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'; testerNote?: string; screenshot?: string }) => d,
  )
  .handler(async ({ data }): Promise<CompleteRunResult> => {
    const { runId, testCase, outcome, testerNote, screenshot } = data
    const now = new Date()

    // Determine which conditions this run establishes
    const statesEstablished = outcome === 'PASSED' ? testCase.establishes : []

    // Mark the run complete and write the result in a transaction
    await rootPrisma.$transaction(async tx => {
      await tx.qaTestRun.update({
        where: { id: runId },
        data: { status: 'COMPLETED', completedAt: now },
      })

      await tx.qaTestResult.create({
        data: {
          runId,
          outcome,
          testerNote: testerNote ?? null,
          screenshot: screenshot ?? null,
          statesEstablished,
        },
      })

      // Update QaConditionState for each established condition
      if (statesEstablished.length > 0) {
        for (const conditionId of statesEstablished) {
          await tx.qaConditionState.upsert({
            where: { conditionId },
            update: { satisfied: true, establishedByRunId: runId, invalidatedAt: null },
            create: { conditionId, satisfied: true, establishedByRunId: runId },
          })
        }
      }
    })

    // Create a defect if the test failed
    let defectId: string | undefined
    if (outcome === 'FAILED') {
      const defect = await rootPrisma.qaDefect.create({
        data: {
          testCaseId: testCase.id,
          runId,
          title: testCase.title,
          description: testerNote ?? 'No description provided.',
          status: 'OPEN',
          priority: testCase.risk === 'CRITICAL' ? 'CRITICAL' : testCase.risk === 'HIGH' ? 'HIGH' : testCase.risk === 'MEDIUM' ? 'MEDIUM' : 'LOW',
        },
      })
      defectId = defect.id
    }

    return { runId, outcome, ...(defectId ? { defectId } : {}) }
  })

// ---------------------------------------------------------------------------
// abandonRun
// ---------------------------------------------------------------------------

export const abandonRun = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { runId: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await rootPrisma.qaTestRun.updateMany({
      where: { id: data.runId, status: 'IN_PROGRESS' },
      data: { status: 'ABANDONED' },
    })
    return { ok: true }
  })

// ---------------------------------------------------------------------------
// getRecentRuns — last completed run per testCaseId (for the test list UI)
// Scoped to the caller's assigned tests. SUPERADMIN sees all.
// Also returns the caller's assigned testCaseIds so the UI can filter the list.
// ---------------------------------------------------------------------------

export const getRecentRuns = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const user = getServerContext(context).user
    const summary = await buildSummaryFromDatabase({ userId: user.id, role: (user as { role?: string }).role ?? '' })
    const canAssign = summary.permissions.includes(Permissions.QA_ASSIGN_TEST)

    // Fetch all assignments once
    const allAssignments = await rootPrisma.qaTestAssignment.findMany({
      select: { testCaseId: true, assigneeId: true },
    })
    const assignedToAnyone = new Set(allAssignments.map(a => a.testCaseId))
    const assignedToMe = new Set(allAssignments.filter(a => a.assigneeId === user.id).map(a => a.testCaseId))

    // Visible test cases:
    // - SUPERADMIN (canAssign): sees tests assigned to them + all unassigned tests
    // - TESTER: sees only tests explicitly assigned to them
    let assignedTestCaseIds: string[] | null

    if (canAssign) {
      // null signals "show all" to the UI — the UI filters using the same logic
      assignedTestCaseIds = null
    } else {
      assignedTestCaseIds = [...assignedToMe]
    }

    // For run scoping, SUPERADMIN sees runs for unassigned tests + their own assigned ones
    const runFilter = canAssign
      ? {
          testCaseId: {
            notIn: [...assignedToAnyone].filter(id => !assignedToMe.has(id)),
          },
        }
      : { testCaseId: { in: [...assignedToMe] } }

    const runs = await rootPrisma.qaTestRun.findMany({
      where: { status: 'COMPLETED', ...runFilter },
      orderBy: { completedAt: 'desc' },
      include: { result: { select: { outcome: true } } },
      take: 200,
    })

    // Keep only the most recent completed run per testCaseId
    const seen = new Set<string>()
    const latest: typeof runs = []
    for (const run of runs) {
      if (!seen.has(run.testCaseId)) {
        seen.add(run.testCaseId)
        latest.push(run)
      }
    }

    return {
      // null means "show all" (SUPERADMIN); an array means "show only these"
      assignedTestCaseIds,
      runs: latest.map(r => ({
        runId: r.id,
        testCaseId: r.testCaseId,
        outcome: r.result?.outcome ?? null,
        testerName: r.testerName,
        completedAt: r.completedAt?.toISOString() ?? null,
      })),
    }
  })

// ---------------------------------------------------------------------------
// getTesters — list all AdminUsers with TESTER or SUPERADMIN role
// ---------------------------------------------------------------------------

export const getTesters = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const testers = await rootPrisma.adminUser.findMany({
      where: {
        role: { in: ['TESTER', 'SUPERADMIN'] },
        deletedAt: null,
      },
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: 'asc' },
    })
    return testers
  })

// ---------------------------------------------------------------------------
// getAssignments — all current assignments (testCaseId → assignee)
// ---------------------------------------------------------------------------

export const getAssignments = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const assignments = await rootPrisma.qaTestAssignment.findMany({
      orderBy: { assignedAt: 'desc' },
    })
    return assignments.map(a => ({
      id: a.id,
      testCaseId: a.testCaseId,
      assigneeId: a.assigneeId,
      assigneeName: a.assigneeName,
      assigneeEmail: a.assigneeEmail,
      assignedById: a.assignedById,
      assignedAt: a.assignedAt.toISOString(),
    }))
  })

// ---------------------------------------------------------------------------
// assignTests — upsert assignments for a list of test case IDs to one tester
//
// Called by SUPERADMIN only (enforced in the UI; server trusts the session role).
// Uses upsert so re-assigning an already-assigned test just updates the record.
// ---------------------------------------------------------------------------

export interface AssignTestsInput {
  testCaseIds: string[]
  assigneeId: string
}

export const assignTests = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: AssignTestsInput) => d)
  .handler(async ({ data, context }): Promise<{ assigned: number }> => {
    const { testCaseIds, assigneeId } = data

    // Resolve assignee details
    const assignee = await rootPrisma.adminUser.findUnique({
      where: { id: assigneeId },
      select: { id: true, name: true, email: true },
    })
    if (!assignee) throw new Error(`Tester not found: ${assigneeId}`)

    // Resolve the caller (super admin making the assignment)
    const callerUser = getServerContext(context).user
    if (!callerUser?.id) throw new Error('UNAUTHENTICATED')

    // Enforce: only users with QA_ASSIGN_TEST permission can assign tests
    const callerSummary = await buildSummaryFromDatabase({ userId: callerUser.id, role: (callerUser as { role?: string }).role ?? '' })
    if (!callerSummary.permissions.includes(Permissions.QA_ASSIGN_TEST)) {
      throw new Error('You do not have permission to assign QA tests.')
    }

    const assignedById = callerUser.id

    const now = new Date()

    // Upsert each assignment — if already assigned to same tester, refresh the timestamp
    await Promise.all(
      testCaseIds.map(testCaseId =>
        rootPrisma.qaTestAssignment.upsert({
          where: { testCaseId_assigneeId: { testCaseId, assigneeId } },
          update: {
            assignedById,
            assigneeName: assignee.name,
            assigneeEmail: assignee.email,
            assignedAt: now,
          },
          create: {
            testCaseId,
            assigneeId,
            assigneeName: assignee.name,
            assigneeEmail: assignee.email,
            assignedById,
            assignedAt: now,
          },
        }),
      ),
    )

    return { assigned: testCaseIds.length }
  })

// ---------------------------------------------------------------------------
// unassignTest — remove a specific assignment
// ---------------------------------------------------------------------------

export const unassignTest = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { testCaseId: string; assigneeId: string }) => d)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    await rootPrisma.qaTestAssignment.deleteMany({
      where: { testCaseId: data.testCaseId, assigneeId: data.assigneeId },
    })
    return { ok: true }
  })
