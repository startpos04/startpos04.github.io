/**
 * qa/types.ts
 *
 * TypeScript types for the QA Companion.
 *
 * Source-controlled test definitions use QaTestCase.
 * Runtime data from the database uses the Prisma-generated types directly.
 */

// ---------------------------------------------------------------------------
// Risk levels
// ---------------------------------------------------------------------------

export type QaRisk = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

// ---------------------------------------------------------------------------
// A single step in a test case
// ---------------------------------------------------------------------------

export interface QaTestStep {
  /** Instruction shown to the tester (plain English). */
  instruction: string
  /** Optional sub-hint shown beneath the instruction in smaller text. */
  hint?: string
  /** A value the tester can copy to the clipboard. */
  copyable?: {
    label: string
    value: string
    secret?: boolean // renders as ●●●● with a show/hide toggle
  }
  /** A URL that opens in a new tab when the tester clicks "Open". */
  openUrl?: string
  /** If true, the tester must confirm a manual environment action (e.g. "go offline") */
  manualAction?: boolean
}

// ---------------------------------------------------------------------------
// Fixture — the exact test data a test depends on
// ---------------------------------------------------------------------------

export interface QaTestFixture {
  /** Tenant account the tester logs in as for this test. */
  account?: string
  /** Branch name the test operates against. */
  branch?: string
  /** Product details referenced in the test steps. */
  product?: {
    name: string
    variant?: string
    sku: string
    price?: string
  }
  /** Minimum stock quantity required before the test can start. */
  requiredStock?: number
  /** Payment method used in the test steps. */
  paymentMethod?: string
  /** Cash tendered (for cash payment tests). */
  tendered?: string
  /** Any additional arbitrary fixture values. */
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// A complete test case definition (source-controlled)
// ---------------------------------------------------------------------------

export interface QaTestCase {
  /** Unique identifier, e.g. "TC-POS-001". */
  id: string
  /** Human-readable title shown in the test list and wizard. */
  title: string
  /** Business risk if this test fails or is not run. */
  risk: QaRisk
  /** Feature area, e.g. "pos", "billing", "inventory". */
  feature: string
  /** Workflow group within the feature, e.g. "checkout", "session". */
  workflow: string
  /** Condition IDs that must be satisfied before this test can be started. */
  requires: string[]
  /** Condition IDs that this test proves when it passes. */
  establishes: string[]
  /** Exact data the tester needs to perform the steps. */
  fixture: QaTestFixture
  /** Ordered list of steps the tester follows. */
  steps: QaTestStep[]
  /** What a passing run looks like — shown on the result screen. */
  expected: string[]
  /** Source file paths this test exercises — used for regression impact analysis. */
  sourceModules: string[]
}

// ---------------------------------------------------------------------------
// Fixture validation — result returned to the UI before a test starts
// ---------------------------------------------------------------------------

export interface FixtureCheckItem {
  conditionId: string
  label: string
  satisfied: boolean
  detail?: string
  prerequisiteTestId?: string
  prerequisiteTestTitle?: string
}

export interface FixtureValidationResult {
  testCaseId: string
  allSatisfied: boolean
  checks: FixtureCheckItem[]
}

// ---------------------------------------------------------------------------
// Test run lifecycle — shapes returned from server functions
// ---------------------------------------------------------------------------

export interface StartRunResult {
  runId: string
  testCaseId: string
  startedAt: string
}

export interface CompleteRunResult {
  runId: string
  outcome: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'
  defectId?: string
}

// ---------------------------------------------------------------------------
// Summary rows used in the test list UI
// ---------------------------------------------------------------------------

export interface QaTestSummary {
  testCase: QaTestCase
  /** Most recent completed run for this test, if any. */
  lastRun?: {
    runId: string
    outcome: 'PASSED' | 'FAILED' | 'BLOCKED' | 'SKIPPED'
    testerName: string
    completedAt: string
  }
  /** RETEST_REQUIRED if a linked defect was recently marked FIXED. */
  retestRequired: boolean
}
