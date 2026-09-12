# StartPOS QA Companion — Plan

> Last updated: September 9, 2026
> Status: **In Progress — Phase 1**
> Scope: `apps/admin` — QA Companion lives here, zero changes to `apps/web`

---

## How to use this document

Each phase is self-contained. You can jump to any phase heading to pick up work there. Inside each phase you'll find: a goal statement, every task with the exact files it touches, and a concrete "done" check you can verify in the running app.

**Jump to a phase:**
- [Phase 0 — Prerequisites & Role Setup](#phase-0--prerequisites--role-setup)
- [Phase 1 — Foundation: Test Execution](#phase-1--foundation-test-execution)
- [Phase 2 — Campaign & Dependency Navigation](#phase-2--campaign--dependency-navigation)
- [Phase 3 — Defect Workflow & Developer View](#phase-3--defect-workflow--developer-view)
- [Phase 4 — V1 Certification Dashboard & Environment Reset](#phase-4--v1-certification-dashboard--environment-reset)
- [Phase 5 — Regression & Test Expansion](#phase-5--regression--test-expansion)

---

## Quick reference — key constants & accounts

| Item | Value | Source |
|---|---|---|
| Trial TX limit | 500 | `packages/constants/lib/app.ts` |
| Trial duration | 30 days | `packages/constants/lib/app.ts` |
| Starting credits | 50 | `packages/constants/lib/credits.ts` |
| Credit cost per TX | 1 | `apps/web/src/lib/billing/credit-engine.ts` |
| Grace period | 7 days | `csv/system/billing-config-defaults.csv` |
| Low balance threshold | 10 | `csv/system/billing-config-defaults.csv` |
| Plans | Trial / Basic / Premium / Enterprise / Perpetual | `csv/system/plans.csv` |
| Default admin password | `123qwe123!1` | `packages/platform/prisma/seeders/admin-accounts.ts` |
| E2E account password | `123qwe123!1` | `packages/platform/prisma/seeders/accounts.ts` |

**Admin panel accounts (seeded):**

| Email | Role | Purpose |
|---|---|---|
| `superadmin@startpos.com` | SUPERADMIN | Full platform access, can reset QA environment |
| `support@startpos.com` | SUPPORT | Read-only platform support |
| `tester@startpos.com` | TESTER | QA Companion — run tests, record results, file defects |

**E2E tenant accounts (seeded via `csv/e2e/accounts.csv`):**

| Email | Role | Business |
|---|---|---|
| `e2e.admin@test.com` | ADMIN | E2E Test Restaurant |
| `e2e.supervisor@test.com` | SUPERVISOR | E2E Test Restaurant / Main Branch |
| `e2e.cashier@test.com` | CASHIER | E2E Test Restaurant / Main Branch |
| `e2e.cashier2@test.com` | CASHIER | E2E Test Restaurant / Main Branch |
| `e2e.supervisor2@test.com` | SUPERVISOR | E2E Test Restaurant / Second Branch |
| `e2e.cashier3@test.com` | CASHIER | E2E Test Restaurant / Second Branch |
| `e2e.admin2@test.com` | ADMIN | E2E Isolation Business |
| `e2e.cashier4@test.com` | CASHIER | E2E Isolation Business |

**E2E products (14 variants, all `E2E-` prefix SKUs):**

| Product | Variant | SKU | Price | Stock |
|---|---|---|---|---|
| E2E Brewed Coffee | Small (8oz) | E2E-COF-SM | ₱80 | 500 |
| E2E Brewed Coffee | Large (16oz) | E2E-COF-LG | ₱120 | 500 |
| E2E Milk Tea | Standard (16oz) | E2E-MT-STD | ₱130 | 500 |
| E2E Milk Tea | Large (22oz) | E2E-MT-LG | ₱160 | 300 |
| E2E Fresh Lemonade | Regular (12oz) | E2E-LEM-REG | ₱70 | 400 |
| E2E House Soda | Original Flavor | E2E-SODA-ORIG | ₱50 | 5000 |
| E2E Sisig Bowl | Standard | E2E-BOWL-SISIG | ₱185 | 100 |
| E2E Fried Chicken Meal | 1pc Chicken with Rice | E2E-MEAL-CHKN | ₱145 | 100 |
| E2E Pork Ribs Platter | Half Rack | E2E-RIBS-HALF | ₱320 | 20 |
| E2E Aglio Olio Pasta | Regular (200g) | E2E-PASTA-REG | ₱160 | 60 |

---

## Architecture in one paragraph

The QA Companion is a set of routes inside `apps/admin`. Testers log into the admin panel at port 3001 (`AdminUser` auth, completely separate from tenant users), open the QA Companion, and follow step-by-step guided tests. Fixture validation queries `rootPrisma` before each test to confirm prerequisites are met. Test definitions are TypeScript files source-controlled in `apps/admin/qa-definitions/`. Execution history (runs, results, defects) lives in `qa_*` database tables. No changes to `apps/web` ever.

---

## Data model (QA-specific Prisma models)

Add as `packages/platform/prisma/models/base/qa.prisma` and register in `generate-schema.ts`:

```prisma
model QaCampaign {
  id          String           @id @default(cuid())
  name        String
  description String?
  status      QaCampaignStatus @default(ACTIVE)
  targetBuild String?
  createdById String           // AdminUser.id
  createdAt   DateTime         @default(now())
  updatedAt   DateTime         @updatedAt

  runs QaTestRun[]

  @@map("qa_campaigns")
}

model QaTestRun {
  id          String      @id @default(cuid())
  testCaseId  String      // source-controlled definition ID
  campaignId  String?
  campaign    QaCampaign? @relation(fields: [campaignId], references: [id])
  testerId    String      // AdminUser.id
  testerName  String      // snapshot at run time
  status      QaRunStatus
  buildRef    String?
  startedAt   DateTime    @default(now())
  completedAt DateTime?
  environment String      @default("qa")

  result QaTestResult?

  @@map("qa_test_runs")
}

model QaTestResult {
  id                 String    @id @default(cuid())
  runId              String    @unique
  run                QaTestRun @relation(fields: [runId], references: [id])
  outcome            QaOutcome
  testerNote         String?
  screenshot         String?   // base64 or URL
  statesEstablished  String[]  // condition IDs established by this run

  createdAt DateTime @default(now())

  @@map("qa_test_results")
}

model QaDefect {
  id          String         @id @default(cuid())
  testCaseId  String
  runId       String
  title       String
  description String
  status      QaDefectStatus @default(OPEN)
  priority    QaPriority
  buildFound  String?
  buildFixed  String?
  fixNote     String?
  resolvedAt  DateTime?
  retestRunId String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("qa_defects")
}

model QaConditionState {
  id                 String    @id @default(cuid())
  conditionId        String
  satisfied          Boolean   @default(false)
  establishedByRunId String?
  invalidatedAt      DateTime?
  buildRef           String?

  updatedAt DateTime @updatedAt

  @@map("qa_condition_states")
}

enum QaCampaignStatus { ACTIVE COMPLETED ARCHIVED }
enum QaRunStatus      { IN_PROGRESS COMPLETED ABANDONED }
enum QaOutcome        { PASSED FAILED BLOCKED SKIPPED }
enum QaDefectStatus   { OPEN INVESTIGATING FIXED RETEST_REQUIRED RETEST_FAILED RESOLVED WONT_FIX }
enum QaPriority       { CRITICAL HIGH MEDIUM LOW }
```

---

## Test definition format

Every test is a TypeScript file in `apps/admin/qa-definitions/tests/<area>/TC-XXX-NNN.ts`:

```ts
// apps/admin/qa-definitions/tests/pos/TC-POS-001.ts
export const TC_POS_001 = {
  id: 'TC-POS-001',
  title: 'Complete a Cash Sale',
  risk: 'CRITICAL',
  feature: 'pos',
  workflow: 'checkout',

  requires: [
    'env.qa_cashier_account',
    'env.qa_branch_exists',
    'env.qa_product_has_stock',
    'env.vendor_session_open',
  ],

  establishes: [
    'pos.completed_sale',
    'pos.inventory_decreased',
    'pos.receipt_generated',
  ],

  fixture: {
    account: 'e2e.cashier@test.com',
    branch: 'E2E Main Branch',
    product: { name: 'E2E Fried Chicken Meal', variant: '1pc Chicken with Rice', sku: 'E2E-MEAL-CHKN' },
    price: '₱145.00',
    requiredStock: 2,
    paymentMethod: 'Cash',
    tendered: '₱500',
  },

  steps: [
    { instruction: 'Open StartPOS in your browser.', hint: 'http://localhost:3000' },
    { instruction: 'Log in with the cashier account.', copyable: { label: 'Email', value: 'e2e.cashier@test.com' } },
    { instruction: 'Add E2E Fried Chicken Meal (1pc Chicken with Rice) to the cart.' },
    { instruction: 'Tap Checkout.' },
    { instruction: 'Select Cash as the payment method.' },
    { instruction: 'Enter ₱500 as the tendered amount.' },
    { instruction: 'Tap Confirm Payment.' },
  ],

  expected: [
    'A receipt is displayed.',
    'The sale appears in the transaction history.',
    'The Chicken Meal stock decreases by 1.',
    'One credit is deducted from the balance.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],
}
```

---

## Bug workflow

```
Test FAILED
    ↓
QaDefect created (status: OPEN)
    ↓
Developer investigates → INVESTIGATING
    ↓
Fix deployed to QA environment
    ↓
Developer marks → FIXED + buildFixed recorded
    ↓
Test flagged → RETEST_REQUIRED
    ↓
Tester re-runs
    ↓
PASSED → RESOLVED     |     FAILED → RETEST_FAILED → INVESTIGATING
```

---

## V1 release criteria

All must be true before V1 launch:
- All CRITICAL tests have a recent PASSED result
- All HIGH tests have a PASSED or documented SKIPPED result
- Zero open CRITICAL defects
- Zero open HIGH defects

---

---

# Phase 0 — Prerequisites & Role Setup

**Status:** ✅ Done (completed September 9, 2026)

**Goal:** The TESTER role exists in the system and a default tester account is seeded. This unlocks the admin panel for QA staff without giving them SUPERADMIN access.

## Tasks

| # | Task | File | Status |
|---|---|---|---|
| 1 | Add `TESTER` to `AdminRole` enum | `packages/platform/prisma/models/base/admin.prisma` | ✅ Done |
| 2 | Add `tester@startpos.com` to admin accounts seeder | `packages/platform/prisma/seeders/admin-accounts.ts` | ✅ Done |
| 3 | Regenerate Prisma client | run `pnpm prisma:generate` | ✅ Done |

## What was added

**`AdminRole` enum** (in `admin.prisma`):
```prisma
TESTER  // QA access — can run the QA Companion, record results, and file defects
```

**Seeded account:**
```
Email:    tester@startpos.com
Password: 123qwe123!1
Role:     TESTER
```

## Done check

Log into `apps/admin` with `tester@startpos.com` / `123qwe123!1`. The login succeeds and the user session has `role: TESTER`.

---

# Phase 1 — Foundation: Test Execution

**Status:** 🔲 Not started

**Goal:** A tester can open a guided test in the admin panel, see a live fixture checklist, step through numbered instructions, and record a pass/fail result that persists in the database.

## Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | Add `qa.prisma` to schema pipeline | `packages/platform/prisma/models/base/qa.prisma` (new), `models/generate-schema.ts` (add to BASE_FILES) |
| 2 | Create QA TypeScript types | `apps/admin/src/lib/qa/types.ts` (new) |
| 3 | Write first 12 critical test definitions | `apps/admin/qa-definitions/tests/` (new — see list below) |
| 4 | Fixture validator server functions | `apps/admin/src/lib/qa/fixture-validator.ts` (new) |
| 5 | Test runner server functions | `apps/admin/src/lib/qa/test-runner.ts` (new) |
| 6 | Test execution wizard UI | `apps/admin/src/routes/(private)/(dashboard)/qa/tests/$testId/run.tsx` (new) |
| 7 | Minimal test list page | `apps/admin/src/routes/(private)/(dashboard)/qa/index.tsx` (new stub) |

## First 12 test definitions (Phase 1 scope)

```
qa-definitions/tests/
  auth/
    TC-AUTH-001.ts   Login as cashier → lands on /pos
    TC-AUTH-002.ts   Login as admin → lands on /dashboard
    TC-AUTH-003.ts   Wrong password → error shown, no access
  pos/
    TC-SESS-001.ts   Open a vendor session (shift)
    TC-POS-001.ts    Cash sale — single item
    TC-POS-002.ts    Cash sale — multiple items
  inventory/
    TC-INV-001.ts    Quick receive → stock increases
  billing/
    TC-BILL-001.ts   Trial TX limit enforced at 500
    TC-BILL-002.ts   Credit balance displayed correctly
    TC-BILL-003.ts   Checkout blocked when credits = 0
  permissions/
    TC-PERM-001.ts   Cashier cannot access /employees
    TC-PERM-002.ts   Cashier cannot access /products
```

## Fixture conditions to implement

| Condition ID | Prisma check |
|---|---|
| `env.qa_cashier_account` | `user.findFirst({ where: { email: 'e2e.cashier@test.com' } })` |
| `env.qa_branch_exists` | `branch.findFirst({ where: { name: 'E2E Main Branch' } })` |
| `env.qa_product_has_stock` | `inventory` rows for fixture variantId, sum ≥ required |
| `env.vendor_session_open` | `vendorSession` with `status: OPEN` for cashier user |
| `env.subscription_active` | `businessSubscription.status` in [TRIAL, ACTIVE, GRACE_PERIOD] |

## Execution wizard screens

**Screen 1 — Fixture check:**
```
TC-POS-001 — Complete a Cash Sale    Risk: 🔴 Critical

Before you start:
  ✓ Cashier account ready
  ✓ QA branch exists
  ✓ Chicken Meal has stock  (100 available)
  ✗ Shift is open
    → Go to: Open a Shift (TC-SESS-001)

[Cancel]
```

**Screen 2–N — Steps:**
```
Step 2 of 7
Log in with this account:
  Email:     e2e.cashier@test.com   [Copy]
  Password:  ●●●●●●●●●●●●         [Show] [Copy]

[← Back]  [I've done this →]
```

**Result screen:**
```
Did everything behave normally?
  [✓ Everything worked]
  [✗ Something went wrong]
  [? I couldn't complete it]
```

**Failure capture:**
```
Tell us what happened:
[ Describe what you saw...          ]
[+ Add Screenshot]
[Submit Report]
```

## Done check

A tester logs into `apps/admin`, navigates to `/qa`, opens TC-POS-001, sees the fixture check with a failing "shift is open" condition (pointing to TC-SESS-001), completes TC-SESS-001 first, returns to TC-POS-001, steps through all 7 instructions, and records a PASSED result. The result row exists in `qa_test_results`.

---

# Phase 2 — Campaign & Dependency Navigation

**Status:** 🔲 Not started

**Goal:** Tests are organized into a named campaign, locked/unlocked based on prerequisite states, and the overall V1 readiness is visible at a glance.

## Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | Seed V1 Certification campaign | `packages/platform/prisma/seeders/qa-campaign.ts` (new) |
| 2 | Campaign dashboard UI | `apps/admin/src/routes/(private)/(dashboard)/qa/index.tsx` (replace stub) |
| 3 | Campaign detail — test list with lock states | `apps/admin/src/routes/(private)/(dashboard)/qa/campaigns/$campaignId/index.tsx` (new) |
| 4 | Prerequisite navigation on fixture screen | Enhancement to Phase 1 wizard |
| 5 | QA environment status page | `apps/admin/src/routes/(private)/(dashboard)/qa/environment/index.tsx` (new) |
| 6 | QA navigation in admin sidebar | `apps/admin/src/routes/(private)/(dashboard)/route.tsx` |
| 7 | Campaign service server functions | `apps/admin/src/lib/qa/campaign-service.ts` (new) |

## Campaign dashboard layout

```
StartPOS QA Companion            ⚠ QA Environment — not for real data

V1 Readiness
─────────────────────────────────────────────────
Authentication           4/4   ████████  100%  ✓
POS & Checkout           2/6   ████░░░░   33%
Inventory                0/4   ░░░░░░░░    0%
Billing & Credits        0/5   ░░░░░░░░    0%
Offline                  0/3   ░░░░░░░░    0%
Permissions              0/4   ░░░░░░░░    0%

Open CRITICAL defects      0   ✓
Open HIGH defects          1   ✗ blocks V1

[Start Testing]  [View All Tests]  [View Defects]
```

## Campaign detail layout

```
V1 Certification Campaign
─────────────────────────────────────────────────
  ✓ TC-AUTH-001  Login as cashier                        PASSED
  ✓ TC-AUTH-002  Login as admin                          PASSED
  ✓ TC-SESS-001  Open a vendor session                   PASSED
  🔒 TC-POS-001  Cash sale (requires: shift open)        LOCKED
  🔲 TC-INV-001  Quick receive (no prereqs)              NOT RUN
```

## Done check

Opening `/qa` shows a campaign card with per-workflow progress bars. Clicking into the campaign shows TC-POS-001 as locked until TC-SESS-001 passes. After TC-SESS-001 passes, TC-POS-001 unlocks and shows as "Ready to test".

---

# Phase 3 — Defect Workflow & Developer View

**Status:** 🔲 Not started

**Goal:** Failed tests produce actionable defect records with full context. Developers can mark defects fixed and testers can retest. Both a tester view and a technical developer view are available.

## Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | Defect capture — screenshot upload + observation form | Enhancement to Phase 1 failure screen |
| 2 | Defect list page | `apps/admin/src/routes/(private)/(dashboard)/qa/defects/index.tsx` (new) |
| 3 | Defect detail page | `apps/admin/src/routes/(private)/(dashboard)/qa/defects/$defectId/index.tsx` (new) |
| 4 | Defect lifecycle server functions | `apps/admin/src/lib/qa/defect-tracker.ts` (new) |
| 5 | Developer view toggle | Enhancement to all QA pages |
| 6 | RETEST_REQUIRED badge on test after defect marked FIXED | Enhancement to campaign detail |

## Defect lifecycle

```
OPEN → INVESTIGATING → FIXED → RETEST_REQUIRED → RESOLVED
                                               → RETEST_FAILED → INVESTIGATING
```

## Developer view additions

When developer view is enabled, every QA page adds:
- Test case ID and source file paths
- Raw condition IDs
- Previous run history with build refs
- Defect technical detail (full fixture state, browser user agent, error stack if available)

## Done check

A FAILED result on TC-POS-001 creates a `QaDefect` row with the tester note and fixture snapshot. A SUPERADMIN marks it FIXED. The campaign view shows TC-POS-001 with a "Retest Required" badge. Tester re-runs and records PASSED, defect moves to RESOLVED.

---

# Phase 4 — V1 Certification Dashboard & Environment Reset

**Status:** 🔲 Not started

**Goal:** The system can definitively answer "are we ready for V1?" with evidence. The QA environment can be wiped and restored to a clean baseline in under a minute.

## Tasks

| # | Task | File(s) |
|---|---|---|
| 1 | V1 readiness certification view | Enhancement to `qa/index.tsx` |
| 2 | QA environment reset server function | `apps/admin/src/lib/qa/environment-reset.ts` (new) |
| 3 | Environment reset UI with explicit confirmation | Enhancement to `qa/environment/index.tsx` |
| 4 | Build/version tracking on test runs | Record `BUILD_ID` env var at run creation |
| 5 | Complete all remaining test definitions (40+) | `apps/admin/qa-definitions/tests/` |

## Full test definition list (all phases)

```
auth/
  TC-AUTH-001  Login as cashier
  TC-AUTH-002  Login as admin
  TC-AUTH-003  Wrong password → error
  TC-AUTH-004  Cashier cannot access /products

pos/
  TC-SESS-001  Open vendor session
  TC-POS-001   Cash sale — single item
  TC-POS-002   Cash sale — multiple items
  TC-POS-003   E-wallet payment (GCash)
  TC-POS-004   SC/PWD discount (20%)
  TC-POS-005   Refund — with inventory restock
  TC-POS-006   Checkout blocked — out of stock (strict mode)
  TC-SESS-002  Close session with cash reconciliation

inventory/
  TC-INV-001  Quick receive → stock increases
  TC-INV-002  GRN flow: create → confirm → stock increases
  TC-INV-003  Manual stock adjustment
  TC-INV-004  Low stock alert notification appears

billing/
  TC-BILL-001  Trial TX limit enforced at 500
  TC-BILL-002  Credit balance displayed correctly
  TC-BILL-003  Checkout blocked when credits = 0
  TC-BILL-004  Expired subscription — POS checkout blocked
  TC-BILL-005  Expired subscription — reports still accessible

offline/
  TC-OFFLINE-001  Offline checkout — designated terminal succeeds
  TC-OFFLINE-002  Offline checkout — non-designated terminal blocked
  TC-OFFLINE-003  Reconnect → offline transaction syncs

permissions/
  TC-PERM-001  Cashier cannot access /employees
  TC-PERM-002  Cashier cannot access /products
  TC-PERM-003  Supervisor can view /sales-reports
  TC-PERM-004  Admin can create an employee

registration/
  TC-REG-001  New business registration completes
  TC-REG-002  Trial subscription auto-provisioned
  TC-REG-003  50 credits appear after registration
```

## V1 certification view

```
StartPOS V1 Certification
────────────────────────────────────────────────────────────
CRITICAL (P0) workflows                  11/11  100%  ✓
HIGH (P1) workflows                       7/9    78%  ✗

Open CRITICAL defects                     0            ✓
Open HIGH defects                         1            ✗  blocks V1

Untested CRITICAL workflows               0            ✓
Untested HIGH workflows                   2            ✗  blocks V1

────────────────────────────────────────────────────────────
V1 STATUS:  ❌ NOT READY

Blockers:
  · TC-OFFLINE-001 (Offline Checkout) — never tested
  · TC-OFFLINE-002 (Offline Sync) — never tested
  · DEF-007 (Refund inventory not restocking) — OPEN HIGH
```

## Environment reset flow

```ts
// SUPERADMIN only
// 1. Verify DATABASE_URL is not production
// 2. Delete all data for e2e-org-1 and e2e-org-2 (FK cascade)
// 3. Re-run: entitlements.ts → accounts.ts(e2e) → e2e.ts
// 4. Clear all QaConditionState rows
// 5. Return summary
```

Reset UI requires typing "RESET" to confirm. The guard:
```ts
import { isProductionDatabaseTarget } from 'packages/platform/prisma/db-script-utils'
if (isProductionDatabaseTarget(process.env.DATABASE_URL)) {
  throw new Error('resetQaEnvironment() refused: detected production database.')
}
```

## Done check

The certification view shows the exact V1 status with specific blockers listed. Clicking "Reset QA Environment", typing RESET, and confirming restores all e2e seed data in under 60 seconds.

---

# Phase 5 — Regression & Test Expansion

**Status:** 🔲 Not started

**Goal:** Test coverage grows organically. Source module metadata lets developers quickly identify which tests to rerun after a code change.

## Tasks

| # | Task |
|---|---|
| 1 | `sourceModules` array on all test definitions |
| 2 | Regression impact view — "tests affected by recent changes" |
| 3 | Documented Kiro prompt patterns for generating new test definitions |
| 4 | Coverage gap report — high-risk areas with no test coverage |

## Kiro prompt pattern for generating tests

```
Generate QA Companion test definitions for [feature/area].
Source files: [list the relevant server function and engine files]
Use the QaTestCase type from apps/admin/src/lib/qa/types.ts.
Reference fixture data from packages/platform/prisma/seeders/csv/e2e/.
Output to apps/admin/qa-definitions/tests/[area]/.
```

## Regression invalidation rule

A PASSED result is only marked RETEST_REQUIRED when:
1. A linked defect is marked FIXED by a developer, or
2. A developer or tester explicitly triggers a retest.

The system never auto-invalidates on code changes. This prevents "any change breaks everything" noise.

## Done check

Every test definition has a `sourceModules` array. The impact view shows a list of tests that reference a given source file. Developers can paste a changed file path and see which tests to prioritize.

---

## Repository context

```
apps/admin/                            ← QA Companion lives here
  src/
    routes/(private)/(dashboard)/
      qa/                              ← QA hub (created in Phase 1+)
    lib/
      qa/                              ← Server functions (created in Phase 1+)
      better-auth/auth.ts              ← AdminUser auth, imports AdminRole
      prisma-client/index.ts           ← re-exports rootPrisma (unrestricted)
  qa-definitions/                      ← Source-controlled test definitions (Phase 1+)

packages/platform/
  prisma/
    models/base/
      admin.prisma                     ← AdminRole enum (TESTER added in Phase 0)
      qa.prisma                        ← QA models (created in Phase 1)
    seeders/
      admin-accounts.ts                ← tester@startpos.com seeded (Phase 0)
      e2e.ts                           ← E2E tenant data (order=200)
      csv/e2e/                         ← accounts.csv, product-variants.csv, inventory.csv
  lib/authorization/
    role-permissions.ts                ← tenant Role permissions (not used for AdminRole)
    permission-keys.ts                 ← all permission constants

apps/web/                              ← DO NOT MODIFY — POS application
```

## Principles

- **Zero changes to `apps/web`** — the QA Companion only observes the POS app, it never modifies it
- **Source-controlled definitions** — test steps and expectations live in Git, not the database
- **Live fixture validation** — conditions are re-checked from `rootPrisma` every time a test is opened, never read from cache
- **Production guard** — environment reset refuses to run if `isProductionDatabaseTarget()` returns true
- **Auth isolation** — `AdminUser` sessions are completely separate from tenant `User` sessions; a tester cannot accidentally touch production data

---

*Based on full repository analysis of `start-pos` as of September 9, 2026. All file paths, constants, and fixture values confirmed from the actual codebase.*
