/**
 * campaign-service.ts
 *
 * Server functions for QA campaign data:
 *   getCampaigns        — list all campaigns with per-workflow progress
 *   getCampaignDetail   — one campaign with per-test lock states
 *   getConditionStates  — current satisfaction state of all condition IDs
 */

import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'
import { ALL_TEST_CASES } from '../../../qa-definitions'
import { FEATURE_LABELS } from './constants'
import type { QaTestCase } from './types'

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface WorkflowProgress {
  feature: string
  label: string
  total: number
  passed: number
  pct: number
}

export interface CampaignSummary {
  id: string
  name: string
  description: string | null
  status: string
  targetBuild: string | null
  createdAt: string
  workflowProgress: WorkflowProgress[]
  openCriticalDefects: number
  openHighDefects: number
}

export interface TestLockState {
  testCase: QaTestCase
  locked: boolean
  /** condition IDs that are blocking this test */
  missingConditions: string[]
  lastRun: {
    runId: string
    outcome: string
    testerName: string
    completedAt: string
  } | null
  retestRequired: boolean
}

export interface CampaignDetail {
  id: string
  name: string
  description: string | null
  status: string
  targetBuild: string | null
  tests: TestLockState[]
}

// ---------------------------------------------------------------------------
// getCampaigns
// ---------------------------------------------------------------------------

export const getCampaigns = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async (): Promise<CampaignSummary[]> => {
    const campaigns = await rootPrisma.qaCampaign.findMany({
      orderBy: { createdAt: 'desc' },
    })

    // Fetch recent runs and open defects once for all campaigns
    const [recentRuns, openDefects] = await Promise.all([
      rootPrisma.qaTestRun.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { completedAt: 'desc' },
        include: { result: { select: { outcome: true } } },
        take: 500,
      }),
      rootPrisma.qaDefect.findMany({
        where: { status: { in: ['OPEN', 'INVESTIGATING', 'RETEST_REQUIRED', 'RETEST_FAILED'] } },
        select: { priority: true },
      }),
    ])

    // Latest run per testCaseId
    const latestRunMap = new Map<string, (typeof recentRuns)[0]>()
    for (const run of recentRuns) {
      if (!latestRunMap.has(run.testCaseId)) latestRunMap.set(run.testCaseId, run)
    }

    const openCritical = openDefects.filter(d => d.priority === 'CRITICAL').length
    const openHigh = openDefects.filter(d => d.priority === 'HIGH').length

    // Build per-feature progress
    const featureGroups = new Map<string, { total: number; passed: number }>()
    for (const tc of ALL_TEST_CASES) {
      if (!featureGroups.has(tc.feature)) featureGroups.set(tc.feature, { total: 0, passed: 0 })
      const g = featureGroups.get(tc.feature)!
      g.total++
      const run = latestRunMap.get(tc.id)
      if (run?.result?.outcome === 'PASSED') g.passed++
    }

    const workflowProgress: WorkflowProgress[] = Array.from(featureGroups.entries()).map(([feature, g]) => ({
      feature,
      label: FEATURE_LABELS[feature] ?? feature,
      total: g.total,
      passed: g.passed,
      pct: g.total > 0 ? Math.round((g.passed / g.total) * 100) : 0,
    }))

    return campaigns.map(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      status: c.status,
      targetBuild: c.targetBuild,
      createdAt: c.createdAt.toISOString(),
      workflowProgress,
      openCriticalDefects: openCritical,
      openHighDefects: openHigh,
    }))
  })

// ---------------------------------------------------------------------------
// getCampaignDetail
// ---------------------------------------------------------------------------

export const getCampaignDetail = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((d: { campaignId: string }) => d)
  .handler(async ({ data }): Promise<CampaignDetail | null> => {
    const campaign = await rootPrisma.qaCampaign.findUnique({
      where: { id: data.campaignId },
    })
    if (!campaign) return null

    // Get latest completed run per testCaseId
    const runs = await rootPrisma.qaTestRun.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { result: { select: { outcome: true } } },
      take: 500,
    })
    const latestRunMap = new Map<string, (typeof runs)[0]>()
    for (const run of runs) {
      if (!latestRunMap.has(run.testCaseId)) latestRunMap.set(run.testCaseId, run)
    }

    // Get condition states
    const conditionStates = await rootPrisma.qaConditionState.findMany({
      where: { satisfied: true, invalidatedAt: null },
      select: { conditionId: true },
    })
    const satisfiedConditions = new Set(conditionStates.map(c => c.conditionId))

    // Tests that establish conditions — build reverse map: conditionId → testId
    const conditionToTest = new Map<string, string>()
    for (const tc of ALL_TEST_CASES) {
      for (const c of tc.establishes) {
        conditionToTest.set(c, tc.id)
      }
    }

    // Check retest requirements
    const retestDefects = await rootPrisma.qaDefect.findMany({
      where: { status: 'RETEST_REQUIRED' },
      select: { testCaseId: true },
    })
    const retestSet = new Set(retestDefects.map(d => d.testCaseId))

    const tests: TestLockState[] = ALL_TEST_CASES.map(tc => {
      const missingConditions = tc.requires.filter(c => !satisfiedConditions.has(c))
      const locked = missingConditions.length > 0
      const run = latestRunMap.get(tc.id)

      return {
        testCase: tc,
        locked,
        missingConditions,
        lastRun: run?.result
          ? {
              runId: run.id,
              outcome: run.result.outcome,
              testerName: run.testerName,
              completedAt: run.completedAt?.toISOString() ?? '',
            }
          : null,
        retestRequired: retestSet.has(tc.id),
      }
    })

    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      status: campaign.status,
      targetBuild: campaign.targetBuild,
      tests,
    }
  })

// ---------------------------------------------------------------------------
// getEnvironmentStatus — live fixture checks for the environment page
// ---------------------------------------------------------------------------

export const getEnvironmentStatus = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .handler(async () => {
    const [cashier, admin, supervisor, branch, business] = await Promise.all([
      rootPrisma.user.findFirst({ where: { email: 'e2e.cashier@test.com' }, select: { id: true, email: true } }),
      rootPrisma.user.findFirst({ where: { email: 'e2e.admin@test.com' }, select: { id: true, email: true } }),
      rootPrisma.user.findFirst({ where: { email: 'e2e.supervisor@test.com' }, select: { id: true, email: true } }),
      rootPrisma.branch.findFirst({ where: { name: 'E2E Main Branch' }, select: { id: true, name: true } }),
      rootPrisma.business.findFirst({
        where: { name: 'E2E Test Restaurant' },
        select: { id: true, name: true, subscription: { select: { status: true } } },
      }),
    ])

    // Stock check for a representative product
    const chickenVariant = await rootPrisma.productVariant.findFirst({
      where: { sku: 'E2E-MEAL-CHKN' },
      select: { inventory: { select: { quantity: true } } },
    })
    const chickenStock = chickenVariant?.inventory.reduce((s, i) => s + i.quantity, 0) ?? 0

    // Open vendor session
    const openSession = cashier
      ? await rootPrisma.vendorSession.findFirst({
          where: { userId: cashier.id, status: 'OPEN' },
          select: { id: true },
        })
      : null

    return {
      accounts: {
        cashier: !!cashier,
        admin: !!admin,
        supervisor: !!supervisor,
      },
      branch: !!branch,
      business: !!business,
      subscriptionStatus: business?.subscription?.status ?? null,
      chickenStock,
      openVendorSession: !!openSession,
    }
  })

// ---------------------------------------------------------------------------
// getRegressionImpact — Phase 5
//
// Given a list of changed source file paths, returns every test case that
// references at least one of those files in its sourceModules array.
// Pure in-memory — no DB query needed (sourceModules live in the definitions).
// ---------------------------------------------------------------------------

export interface RegressionImpactResult {
  /** The changed file path as supplied by the caller */
  changedFile: string
  /** Test cases that reference this file */
  affectedTests: Array<{
    id: string
    title: string
    risk: string
    feature: string
    workflow: string
    lastOutcome: string | null
    completedAt: string | null
  }>
}

export const getRegressionImpact = createServerFn({ method: 'GET' })
  .middleware([authMiddleware])
  .inputValidator((d: { changedFiles: string[] }) => d)
  .handler(async ({ data }): Promise<RegressionImpactResult[]> => {
    const { changedFiles } = data
    if (!changedFiles.length) return []

    // Fetch latest run outcomes for all test cases in one query
    const runs = await rootPrisma.qaTestRun.findMany({
      where: { status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
      include: { result: { select: { outcome: true } } },
      take: 500,
    })
    const latestRunMap = new Map<string, (typeof runs)[0]>()
    for (const run of runs) {
      if (!latestRunMap.has(run.testCaseId)) latestRunMap.set(run.testCaseId, run)
    }

    // Normalize input paths for loose matching (trim whitespace, forward slashes)
    const normalize = (p: string) => p.trim().replace(/\\/g, '/')

    return changedFiles.map(raw => {
      const changedFile = normalize(raw)

      const affectedTests = ALL_TEST_CASES.filter(tc =>
        tc.sourceModules.some(m => {
          const mod = normalize(m)
          // Match if the changed path is a suffix of the module path or vice-versa
          return mod.endsWith(changedFile) || changedFile.endsWith(mod) || mod === changedFile
        }),
      )
        .map(tc => {
          const run = latestRunMap.get(tc.id)
          return {
            id: tc.id,
            title: tc.title,
            risk: tc.risk,
            feature: tc.feature,
            workflow: tc.workflow,
            lastOutcome: run?.result?.outcome ?? null,
            completedAt: run?.completedAt?.toISOString() ?? null,
          }
        })
        // Sort by risk severity then by last outcome (FAILED first)
        .sort((a, b) => {
          const riskOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
          const rd = (riskOrder[a.risk as keyof typeof riskOrder] ?? 3) - (riskOrder[b.risk as keyof typeof riskOrder] ?? 3)
          if (rd !== 0) return rd
          // FAILED/null before PASSED
          if (a.lastOutcome === 'FAILED' && b.lastOutcome !== 'FAILED') return -1
          if (b.lastOutcome === 'FAILED' && a.lastOutcome !== 'FAILED') return 1
          return 0
        })

      return { changedFile, affectedTests }
    })
  })
