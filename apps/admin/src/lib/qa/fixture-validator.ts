/**
 * fixture-validator.ts
 *
 * Server function that checks whether all required conditions for a test case
 * are currently satisfied. Called every time a tester opens a test — never
 * reads from cached QaConditionState.
 *
 * Uses rootPrisma to query the live database directly.
 */

import { createServerFn } from '@tanstack/react-start'
import { authMiddleware } from '@/lib/better-auth/auth-middleware'
import { prisma as rootPrisma } from '@/lib/prisma-client'
import { CONDITIONS } from './constants'
import type { FixtureCheckItem, FixtureValidationResult, QaTestCase } from './types'

// ---------------------------------------------------------------------------
// Individual condition checkers — each returns a FixtureCheckItem
// ---------------------------------------------------------------------------

async function checkQaCashierAccount(): Promise<FixtureCheckItem> {
  const user = await rootPrisma.user.findFirst({
    where: { email: 'e2e.cashier@test.com' },
    select: { id: true },
  })
  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.QA_CASHIER_ACCOUNT,
    label: 'Cashier account ready (e2e.cashier@test.com)',
    satisfied: !!user,
  }
  if (!user) item.detail = 'Account not found — run the E2E seeder first.'
  return item
}

async function checkQaAdminAccount(): Promise<FixtureCheckItem> {
  const user = await rootPrisma.user.findFirst({
    where: { email: 'e2e.admin@test.com' },
    select: { id: true },
  })
  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.QA_ADMIN_ACCOUNT,
    label: 'Admin account ready (e2e.admin@test.com)',
    satisfied: !!user,
  }
  if (!user) item.detail = 'Account not found — run the E2E seeder first.'
  return item
}

async function checkQaSupervisorAccount(): Promise<FixtureCheckItem> {
  const user = await rootPrisma.user.findFirst({
    where: { email: 'e2e.supervisor@test.com' },
    select: { id: true },
  })
  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.QA_SUPERVISOR_ACCOUNT,
    label: 'Supervisor account ready (e2e.supervisor@test.com)',
    satisfied: !!user,
  }
  if (!user) item.detail = 'Account not found — run the E2E seeder first.'
  return item
}

async function checkQaBranchExists(): Promise<FixtureCheckItem> {
  const branch = await rootPrisma.branch.findFirst({
    where: { name: 'E2E Main Branch' },
    select: { id: true },
  })
  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.QA_BRANCH_EXISTS,
    label: 'E2E Main Branch exists',
    satisfied: !!branch,
  }
  if (!branch) item.detail = 'Branch not found — run the E2E seeder first.'
  return item
}

async function checkQaProductHasStock(sku: string, requiredQty = 1): Promise<FixtureCheckItem> {
  const variant = await rootPrisma.productVariant.findFirst({
    where: { sku },
    select: {
      id: true,
      inventory: { select: { quantity: true } },
    },
  })

  const totalStock = variant?.inventory.reduce((sum, i) => sum + i.quantity, 0) ?? 0
  const satisfied = totalStock >= requiredQty

  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.QA_PRODUCT_HAS_STOCK,
    label: `Product has stock (${sku}, need ${requiredQty})`,
    satisfied,
  }
  if (!satisfied) {
    item.detail = `Stock is ${totalStock} — need at least ${requiredQty}. Reset the QA environment to restore stock.`
  }
  return item
}

async function checkSubscriptionActive(): Promise<FixtureCheckItem> {
  const business = await rootPrisma.business.findFirst({
    where: { name: 'E2E Test Restaurant' },
    select: {
      id: true,
      subscription: { select: { status: true } },
    },
  })

  const status = business?.subscription?.status
  const activeStatuses = ['TRIAL', 'ACTIVE', 'GRACE_PERIOD']
  const satisfied = !!status && activeStatuses.includes(status)

  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
    label: 'Subscription is active (TRIAL, ACTIVE, or GRACE_PERIOD)',
    satisfied,
  }
  if (!satisfied) {
    item.detail = `Subscription status is "${status ?? 'missing'}" — reset QA environment or re-seed to restore TRIAL status.`
  }
  return item
}

async function checkVendorSessionOpen(): Promise<FixtureCheckItem> {
  const cashier = await rootPrisma.user.findFirst({
    where: { email: 'e2e.cashier@test.com' },
    select: { id: true },
  })

  if (!cashier) {
    return {
      conditionId: CONDITIONS.VENDOR_SESSION_OPEN,
      label: 'Shift is open',
      satisfied: false,
      detail: 'Cashier account not found.',
      prerequisiteTestId: 'TC-AUTH-001',
      prerequisiteTestTitle: 'Log In as Cashier',
    }
  }

  const session = await rootPrisma.vendorSession.findFirst({
    where: { userId: cashier.id, status: 'OPEN' },
    select: { id: true },
  })

  const item: FixtureCheckItem = {
    conditionId: CONDITIONS.VENDOR_SESSION_OPEN,
    label: 'Shift is open',
    satisfied: !!session,
  }
  if (!session) {
    item.detail = 'No open shift found for the cashier.'
    item.prerequisiteTestId = 'TC-SESS-001'
    item.prerequisiteTestTitle = 'Open a Shift'
  }
  return item
}

// ---------------------------------------------------------------------------
// Condition dispatcher — maps condition ID → checker function
// ---------------------------------------------------------------------------

async function resolveCondition(conditionId: string, testCase: QaTestCase): Promise<FixtureCheckItem> {
  switch (conditionId) {
    case CONDITIONS.QA_CASHIER_ACCOUNT:
      return checkQaCashierAccount()
    case CONDITIONS.QA_ADMIN_ACCOUNT:
      return checkQaAdminAccount()
    case CONDITIONS.QA_SUPERVISOR_ACCOUNT:
      return checkQaSupervisorAccount()
    case CONDITIONS.QA_BRANCH_EXISTS:
      return checkQaBranchExists()
    case CONDITIONS.QA_PRODUCT_HAS_STOCK: {
      const sku = testCase.fixture.product?.sku ?? ''
      const required = testCase.fixture.requiredStock ?? 1
      return checkQaProductHasStock(sku, required)
    }
    case CONDITIONS.QA_SUBSCRIPTION_ACTIVE:
      return checkSubscriptionActive()
    case CONDITIONS.VENDOR_SESSION_OPEN:
      return checkVendorSessionOpen()
    default:
      // Unknown condition — treat as satisfied so it doesn't block a test
      return {
        conditionId,
        label: conditionId,
        satisfied: true,
        detail: 'No checker implemented for this condition (treated as satisfied).',
      }
  }
}

// ---------------------------------------------------------------------------
// Exported server function
// ---------------------------------------------------------------------------

export const validateTestFixtures = createServerFn({ method: 'POST' })
  .middleware([authMiddleware])
  .inputValidator((d: { testCase: QaTestCase }) => d)
  .handler(async ({ data }): Promise<FixtureValidationResult> => {
    const { testCase } = data

    const checks = await Promise.all(testCase.requires.map(conditionId => resolveCondition(conditionId, testCase)))

    return {
      testCaseId: testCase.id,
      allSatisfied: checks.every(c => c.satisfied),
      checks,
    }
  })
