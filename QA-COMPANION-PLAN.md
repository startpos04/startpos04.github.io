# StartPOS QA Companion — Architecture & Implementation Plan

**Status:** Planning / Pre-implementation — awaiting review  
**Date:** September 2026  
**Revision:** 2 (incorporating deprecated-tests clarification)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Repository Analysis](#2-repository-analysis)
3. [Existing Test Infrastructure — Deprecation Assessment](#3-existing-test-infrastructure--deprecation-assessment)
4. [What Gets Deleted and Why](#4-what-gets-deleted-and-why)
5. [What Survives (Application Infrastructure)](#5-what-survives-application-infrastructure)
6. [Gaps in Current Infrastructure](#6-gaps-in-current-infrastructure)
7. [Proposed Architecture](#7-proposed-architecture)
8. [Data Model (QA Metadata Database)](#8-data-model-qa-metadata-database)
9. [Dependency Engine Design](#9-dependency-engine-design)
10. [Fixture System Design](#10-fixture-system-design)
11. [Tester UX Design](#11-tester-ux-design)
12. [Kiro Integration](#12-kiro-integration)
13. [Regression System](#13-regression-system)
14. [Bug Workflow](#14-bug-workflow)
15. [V1 Release Certification](#15-v1-release-certification)
16. [Security and Environment Isolation](#16-security-and-environment-isolation)
17. [Implementation Phases](#17-implementation-phases)
18. [File-Level Changes Summary](#18-file-level-changes-summary)
19. [Risks](#19-risks)
20. [Open Questions](#20-open-questions)
21. [Recommendation](#21-recommendation)

---

## 1. Executive Summary

### Is This Technically Practical?

Yes. The StartPOS codebase contains strong application-level infrastructure that the QA Companion can build on directly. The Prisma schema, seeder pipeline, `@startpos/platform` shared package, Better Auth, and the monorepo toolchain are all solid foundations.

### The Key Clarification in This Revision

The existing automated test suite — unit tests, integration tests, E2E specs, test helpers, and test database infrastructure — is **deprecated and will be deleted**. It is not a foundation for the new QA architecture. It is historical context only.

The new QA strategy starts from the **current StartPOS application code and schema**, not from whatever assumptions the obsolete tests encoded.

### What the QA Companion Solves

Manual testing of StartPOS is currently a bottleneck because the developer must carry all of the following knowledge in their head:

- What should be tested and in what order
- What account, branch, product, and billing state each test requires
- What the expected outcome looks like
- Which tests must pass before another test is meaningful
- What to retest after a code change

The QA Companion externalizes all of that knowledge. Testers — including non-developers — only supply observation.

### Architecture in One Sentence

A new TanStack Start app (`apps/qa`) inside the existing monorepo, backed by a dedicated QA PostgreSQL database and a QA metadata PostgreSQL database, driven by source-controlled test definition files that Kiro generates and maintains.

---

## 2. Repository Analysis

### 2.1 Monorepo Structure (Confirmed)

```
start-pos/
├── apps/
│   ├── web/            Main StartPOS application (TanStack Start, React 19, Vite 7)
│   ├── admin/          Platform admin app (identical stack to web)
│   ├── calling-card/   Astro marketing site
│   ├── stripe/         Stripe tooling
│   └── website/        Public website
├── packages/
│   ├── platform/       Shared: Prisma schema, seeders, collections, auth, lib
│   └── constants/      Shared constants
└── scripts/            Build/dev scripts
```

Toolchain: **pnpm 10 workspaces** + **Turborepo 2**.

### 2.2 Core Application Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | TanStack Start | ^1.132.0 |
| Router | TanStack Router | ^1.132.0 |
| UI | React 19 + Radix UI + Tailwind CSS v4 | React ^19.2.0 |
| Forms | TanStack Form | ^1.28.5 |
| Server fns | `createServerFn` (@tanstack/react-start) | — |
| Database | PostgreSQL via Prisma + PrismaPg | Prisma ^7.8.0 |
| Collections | TanStack DB + SQLite persistence | @tanstack/db 0.6.5 |
| Auth | Better Auth | ^1.5.5 |
| Payment | Stripe | 22.4.0 |
| Email | Resend | ^6.18.1 |
| PWA | Serwist | ^9.5.7 |
| Testing | Vitest 4 + Playwright 1.58 | (deprecated — see §3) |

### 2.3 Platform Package (`packages/platform`)

The single most important shared dependency. Key contents:

| Path | Purpose |
|---|---|
| `prisma/schema.prisma` | Authoritative database schema (generated from model fragments) |
| `prisma/models/base/` | 18 Prisma model fragment files |
| `prisma/seeders/` | CSV-driven multi-folder seeder pipeline |
| `prisma/seeders/csv/` | Seed datasets: `e2e/`, `retail/`, `restaurant/`, `grocery/`, `system/` |
| `db/collections.ts` | 33+ TanStack DB collection definitions |
| `db/local-db-transaction.ts` | Offline-capable write layer |
| `lib/prisma-client/crud-api.ts` | Typed Prisma proxy for tenant reads |
| `lib/prisma-client/core-api.ts` | Platform-level reads (plans, features) |
| `lib/authorization/permission-keys.ts` | Full permission key registry (~50 permissions) |
| `lib/entitlement/entitlement-engine.ts` | Pure capability evaluation engine |
| `lib/entitlement/capability-keys.ts` | Capability key constants |
| `lib/better-auth/` | Auth configuration |

### 2.4 Database Schema — Domain Areas (from Prisma models)

Confirmed model files and their domains:

| File | Models |
|---|---|
| `auth.prisma` | `Session`, `Account`, `Verification` |
| `core.prisma` | `Business`, `Branch`, `Membership`, `User`, `AuditLog` |
| `billing.prisma` | `BusinessSubscription`, `SubscriptionStatusHistory`, `Feature`, `SubscriptionPlan`, `PlanEntitlement`, `EntitlementOverride`, `UsageCounter`, `BillingInvoice`, `BillingInvoiceItem`, `CreditLedger`, `BusinessSubscriptionAddon`, `BusinessSubscriptionFeature`, `BillingPayment`, `BillingPaymentAttempt`, `WebhookEvent`, `PaymentNotification` |
| `permissions.prisma` | `Permission`, `UserPermission`, `RoleDefaultPermission` |
| `transaction.prisma` | `Transaction`, `TransactionTaxLine` |
| `order.prisma` | `Order`, `OrderItem`, `OrderItemAddon`, `Payment`, `VendorSession` |
| `inventory.prisma` | `Location`, `Inventory`, `InventoryMovement`, `Customer`, `Supplier`, `Purchase`, `PurchaseItem` |
| `goods-receipt.prisma` | `GoodsReceipt`, `GoodsReceiptItem` |
| `product.prisma` | `Product`, `ProductVariant`, `Unit`, `Category`, etc. |
| `production.prisma` | `ProductionOrder`, `ProductionOrderItem` |
| `operations.prisma` | `OperationalTask`, `Notification`, `SequenceCounter`, `SequenceAudit` |
| `bos.prisma` | `BusinessCapabilityState`, `BusinessEventLog`, etc. |
| `config.prisma` | `Configuration` |
| `pricing.prisma` | `PricingCatalog`, `PricingQuote`, `FeatureBundle`, etc. |

### 2.5 Application Routes (Confirmed from file system)

```
(public)/login, register/, forgot-password
(private)/(dashboard)/
    dashboard, billing/, business/branches+customers+permissions+profile+subscription+suppliers,
    employees/, inventory-reports/, order-history/, products/, purchases/,
    sales-reports/, settings/, transactions/, preparation/, ingredients/
(private)/pos/, orders/, tasks/
```

### 2.6 Existing Enums Relevant to QA

From `_enums.prisma` — key enums the QA system will model against:

- `SubscriptionStatus`: TRIAL, ACTIVE, GRACE_PERIOD, EXPIRED, SUSPENDED, LONG_TERM_INACTIVE, CANCELLED
- `BillingModel`: MONTHLY_SUBSCRIPTION, YEARLY_SUBSCRIPTION, PREPAID_CREDITS, HYBRID, COMPOSABLE_FEATURES
- `Role`: OWNER, ADMIN, SUPERVISOR, CASHIER, SERVICE_PROVIDER
- `TaskStatus`: DRAFT, PENDING, APPROVED, IN_PROGRESS, FULFILLED, REVIEWED, CANCELLED
- `PurchaseStatus`: DRAFT, PENDING_APPROVAL, APPROVED, RECEIVED, VOIDED, CLOSED
- `TransactionType`: SALE, REFUND, ADJUSTMENT
- `MovementType`: IN, OUT, ADJUST, WASTE, EXTERNAL_TRANSFER, INTERNAL_TRANSFER, PRODUCTION_IN, PRODUCTION_OUT

### 2.7 Existing Seeder Infrastructure

The seeder at `packages/platform/prisma/seeders/index.ts` uses a folder-based pipeline:

- System seeders run always (`entitlements.ts`, `hints.ts`)
- Tenant seeders run for the target `SEED_FOLDER`
- Folder-locked seeders only run for exact folder match (`e2e.ts` → `SEED_FOLDER=e2e`)
- CSV files in `seeders/csv/<folder>/` drive all data
- Password for all seeded accounts: `123qwe123!1`

Existing seed folder `e2e/` contains accounts, products, inventory, orders, transactions, payments, tasks, notifications, purchases — a complete restaurant dataset.

---

## 3. Existing Test Infrastructure — Deprecation Assessment

The following table classifies every component of the current test infrastructure. This assessment was made by inspecting the actual files, not by assumption.

### 3.1 Unit Tests — `apps/web/__tests__/unit/`

| Directory | Contents | Classification | Reason |
|---|---|---|---|
| `lib/billing/` | 14 test files: CreditEngine, SubscriptionEngine, InvoiceEngine, PlanEngine, PricingEngine, UsageEngine, payment registry, advance payment, reactivation, subscription policy/status | **Deprecated** | May encode assumptions from a specific phase of the billing architecture that no longer matches current behavior. Cannot be trusted without re-validation against current code. |
| `lib/authorization/` | Auth engine tests | **Deprecated** | Same reason |
| `lib/entitlement/` | Entitlement engine tests | **Deprecated** | Same reason |
| `lib/inventory/` | Inventory engine tests | **Deprecated** | Same reason |
| `lib/queries/` | In-memory integration tests for server functions | **Deprecated** | Server function shapes and behaviors may have changed |
| `lib/billing/`, `lib/conversion/`, etc. | All other lib tests | **Deprecated** | All deprecated for the same reason |
| `components/` | Component tests | **Deprecated** | UI has evolved |
| `db/`, `hooks/`, `store/`, `routes/` | Various | **Deprecated** | Encoding stale assumptions |
| `setup-check.test.ts` | Vitest setup verification | **Deprecated** | No longer needed once infrastructure is replaced |

**Verdict: Delete the entire `__tests__/unit/` directory.**

### 3.2 Integration Tests — `apps/web/__tests__/integration/`

| File | Contents | Classification | Reason |
|---|---|---|---|
| `billing/billing-journey.integration.test.ts` | Multi-handler billing test (Pattern C2) | **Deprecated** | Billing architecture has evolved across multiple phases; test may reflect an intermediate state |
| `registration/complete-registration.integration.test.ts` | Full signup flow (Pattern C1) | **Deprecated** | Registration flow uses onboarding survey path; test may reflect the deprecated v1 path |
| `registration/trial-configuration.integration.test.ts` | Trial setup | **Deprecated** | Trial configuration details (duration, credits, limits) may have changed |
| `seed/trial-plan-seeding.integration.test.ts` | Plan seeding | **Deprecated** | Plan names and prices may differ |
| `queries/create-pos-refund.integration.test.ts` | Refund flow | **Deprecated** | Refund business rules may have changed |
| `queries/reactivate-subscription.test.ts` | Subscription reactivation | **Deprecated** | Reactivation logic across billing phases may differ |
| `queries/sequence-allocation-concurrency.integration.test.ts` | Sequence generation | **Deprecated** | Sequence generation behavior may have changed |
| `helpers/` (all 5 files) | `fixtures.ts`, `test-db.ts`, `index.ts`, `setup.ts`, `global-setup.ts` | **Delete as part of integration test removal** | Infrastructure exists to support deleted tests |

**Verdict: Delete the entire `__tests__/integration/` directory.**

Note: The *patterns* in `test-db.ts` (SAVEPOINT-based rollback) and `fixtures.ts` (programmatic tenant seeding) are conceptually sound and may be worth recreating from scratch when building the new automated test suite later. However, the specific implementations should be rewritten against the current schema rather than preserved as-is.

### 3.3 E2E Tests — `apps/web/__tests__/e2e/`

| File | Classification | Reason |
|---|---|---|
| All 17 spec files | **Deprecated** | The `V1-CERTIFICATION-MATRIX.md` within the same directory explicitly documents `🚫 NOT IMPLEMENTED` for offline POS (a P0 requirement), confirms several specs use `data-testid` selectors that may not match the actual UI, and admits Stripe webhook verification is not achievable in the current setup. The E2E specs are partly aspirational documentation rather than reliable executable tests. |
| `global-setup.ts` | **Deprecated** | Supports the deleted specs |
| `fixtures/` directory | **Deprecated** | Auth state files generated by the deleted global-setup |
| `V1-CERTIFICATION-MATRIX.md` | **Keep as historical reference** | Contains honest gap documentation that is useful input for writing new QA Companion test cases |
| `README.md` | **Deprecated** |  |

**Verdict: Delete the entire `__tests__/e2e/` directory except `V1-CERTIFICATION-MATRIX.md`, which should be moved to `docs/` as a historical reference.**

### 3.4 Test Helpers — `apps/web/__tests__/helpers/`

| File | Classification | Reason |
|---|---|---|
| `factories.ts` | **Deprecated** | Generates mock data against stale field assumptions |
| `mock-collections.ts` | **Deprecated** | Collection mocks encoding collection shapes that may have changed |
| `mock-user.ts` | **Deprecated** | User mock shape may differ from current auth context |
| `router-wrapper.tsx` | **Deprecated** | Test utility with no purpose once unit/integration tests are gone |
| `index.ts` | **Deprecated** | Barrel export for above |

**Verdict: Delete the entire `__tests__/helpers/` directory.**

### 3.5 Test Configuration Files in `apps/web/`

| File | Classification | What to Do |
|---|---|---|
| `vitest.config.ts` | **Deprecated** | Delete or keep as empty skeleton for future unit tests |
| `vitest.integration.config.ts` | **Deprecated** | Delete |
| `tsconfig.test.json` | **Deprecated** | Delete (types: vitest/globals, @testing-library/jest-dom no longer needed) |
| `playwright.config.ts` | **Deprecated** | Delete |
| `src/test-setup.ts` | **Deprecated** | Delete (jsdom polyfills for testing library, no longer needed) |

### 3.6 Test-Only Dependencies in `apps/web/package.json`

The following `devDependencies` exist solely to support the deprecated test suite and can be removed when the tests are deleted:

```
@faker-js/faker
@playwright/test
@testing-library/dom
@testing-library/jest-dom
@testing-library/react
@vitejs/plugin-react          ← also used by vite build; keep
@vitest/coverage-v8
canvas
jsdom
type-coverage
```

Keep: `@vitejs/plugin-react`, `vite-tsconfig-paths`, `typescript`, `tsx`, `dotenv`, `dotenv-cli`, `cross-env`, `fallow`, `jimp`, `serwist`, `@serwist/build`, `@tailwindcss/vite`, `@tanstack/devtools-vite`.

### 3.7 Integration Test Database Infrastructure

The `start-pos-test` database referenced in `.env.local` (`TEST_POSTGRES_DB=start-pos-test`) exists solely for the deprecated integration tests. Once those tests are deleted:

- The `TEST_POSTGRES_DB` environment variable can be removed from `.env.local` and `.env.local.example`
- The `start-pos-test` PostgreSQL database can be dropped
- The integration test global-setup logic that creates and schema-pushes to this database is gone with the tests

The `turbo.json` entries for `test:integration` will also become dead configuration.

---

## 4. What Gets Deleted and Why

This section lists everything that should be deleted as part of the cleanup, with the explicit reason for each deletion.

### Directories to Delete

```
apps/web/__tests__/unit/            All deprecated unit tests
apps/web/__tests__/integration/     All deprecated integration tests + helpers
apps/web/__tests__/e2e/             All deprecated E2E specs + global-setup + fixtures
                                    EXCEPT: move V1-CERTIFICATION-MATRIX.md → docs/
apps/web/__tests__/helpers/         All deprecated test helpers
```

The `apps/web/__tests__/` directory will be empty after these deletions. It can be removed entirely or left as a placeholder.

### Files to Delete in `apps/web/`

```
vitest.config.ts
vitest.integration.config.ts
tsconfig.test.json
playwright.config.ts
src/test-setup.ts
```

### Packages to Remove from `apps/web/package.json` devDependencies

```
@faker-js/faker
@playwright/test
@testing-library/dom
@testing-library/jest-dom
@testing-library/react
@vitest/coverage-v8
canvas
jsdom
type-coverage
```

### Scripts to Remove from `apps/web/package.json`

```
test                    (vitest run --config vitest.config.ts)
test:integration        (vitest run --config vitest.integration.config.ts)
coverage
coverage:integration
coverage:all
pretest:e2e
test:e2e
test:e2e:ui
test:e2e:headed
test:e2e:clean
type-coverage
type-coverage:report
```

Keep `validate` only if it's redefined without the test steps, otherwise remove it too.

### Environment Variables to Remove (from `.env.local`, `.env.local.example`)

```
TEST_POSTGRES_DB
```

### turbo.json Tasks to Remove

```
test:integration
```

The `test` task in turbo.json can remain as a placeholder skeleton for when the fresh unit test suite is written later.

### Database to Drop (when ready)

```
start-pos-test      (PostgreSQL database used only by deprecated integration tests)
```

---

## 5. What Survives (Application Infrastructure)

Everything in the StartPOS application itself is untouched. The QA strategy must adapt to the application, never the reverse.

### Survives Completely

| Area | Files | Why It Survives |
|---|---|---|
| Prisma schema | `packages/platform/prisma/schema.prisma` and all `models/base/*.prisma` | Authoritative source of truth for the database |
| Seeder pipeline | `packages/platform/prisma/seeders/index.ts`, `db-script-utils.ts`, `db-push.ts`, `reset-db.ts` | The QA fixture system extends this rather than replaces it |
| CSV seed data | `packages/platform/prisma/seeders/csv/e2e/`, `retail/`, `restaurant/`, etc. | These are application datasets, not test infrastructure |
| Platform lib | `packages/platform/lib/` — all engines, APIs, auth, entitlement | These are the production code being tested |
| Collections | `packages/platform/db/collections.ts` | Production offline-first infrastructure |
| apps/web source | `apps/web/src/` — all routes, components, lib | The application being tested |
| apps/admin | `apps/admin/` | Separate concern; survives untouched |

### Survives as Historical Reference (Move, Don't Delete)

```
apps/web/__tests__/e2e/V1-CERTIFICATION-MATRIX.md
    → Move to: docs/qa-history/v1-certification-matrix-original.md
```

This document contains honest gap documentation that is valuable input for writing new QA Companion test cases — particularly the confirmed `🚫 NOT IMPLEMENTED` items.

---

## 6. Gaps in Current Infrastructure

These are things the QA Companion needs that do not currently exist in the repository.

| Gap | Needed For | Proposed Solution |
|---|---|---|
| Dedicated QA database | QA fixture state separate from dev | New PostgreSQL database: `start-pos-qa` |
| QA metadata database | Storing test runs, results, bugs, campaigns | New PostgreSQL database: `start-pos-qa-meta` |
| QA CSV seed folder | Deterministic QA-specific test data | Create `seeders/csv/qa/` |
| QA seeder entry point | Running the QA seed cleanly | Register `qa` as valid folder in `db-script-utils.ts` |
| `apps/qa` application | The QA Companion itself | New app, same stack as `apps/admin` |
| QA metadata Prisma schema | `TestCase`, `Bug`, `TestRun`, etc. | New `apps/qa/prisma/schema.prisma` |
| Fixture validator | Checking QA DB state before a test runs | `apps/qa/src/lib/fixture-validator/` |
| Dependency engine | Lock/unlock tests based on conditions | `apps/qa/src/lib/dependency-engine/` |
| Test definition format | Structured TypeScript definitions for Kiro to generate | New `qa/` directory at repo root |

---

## 7. Proposed Architecture

### 7.1 Application Structure

```
apps/
└── qa/                                     NEW QA Companion app
    ├── src/
    │   ├── routes/
    │   │   ├── (public)/
    │   │   │   └── login.tsx               Simple credential login
    │   │   └── (private)/
    │   │       ├── dashboard.tsx            Campaign overview + V1 gate
    │   │       ├── campaigns/               Campaign management
    │   │       │   ├── index.tsx
    │   │       │   └── $campaignId/
    │   │       │       └── index.tsx
    │   │       ├── execute/
    │   │       │   └── $testCaseCode.tsx    Guided tester wizard
    │   │       ├── bugs/
    │   │       │   └── index.tsx
    │   │       ├── environment/
    │   │       │   └── index.tsx            Fixture validation + reset
    │   │       └── developer/
    │   │           └── index.tsx            Technical views, regression
    │   ├── lib/
    │   │   ├── qa-prisma/                   Two Prisma clients (see §7.2)
    │   │   ├── fixture-validator/           Validates QA DB state
    │   │   ├── dependency-engine/           Lock/unlock logic
    │   │   ├── sync-definitions/            Syncs qa/ definitions → meta DB
    │   │   └── server-fn/
    │   │       ├── test-run.ts
    │   │       ├── bug.ts
    │   │       ├── campaign.ts
    │   │       └── environment-reset.ts
    │   ├── components/
    │   └── styles.css
    ├── package.json
    ├── vite.config.ts
    ├── tsconfig.json
    └── prisma.config.ts                     Points to qa-meta schema
```

### 7.2 Two-Database Strategy

The QA app uses two Prisma clients, named unambiguously:

**`qaAppPrisma`** — reads from `start-pos-qa` (the StartPOS QA database)
- Uses the existing `crudAPI` from `@startpos/platform` configured against `QA_DATABASE_URL`
- Read-only from the QA app's perspective
- Used only for fixture validation: "Does this product exist? Does this account have this permission? What is the credit balance?"
- All writes to this database happen through the actual StartPOS app (which the tester is running)
- Reseeded via the `environment-reset.ts` server function (admin action only)

**`qaMetaPrisma`** — reads and writes to `start-pos-qa-meta` (the QA metadata database)
- Custom Prisma schema defined in `apps/qa/prisma/schema.prisma`
- Stores `TestCase`, `TestCampaign`, `TestRun`, `TestResult`, `Bug`, `ConditionState`, etc.
- Never touched by StartPOS resets
- Survives fixture resets because it is a completely separate database

### 7.3 Test Definition Repository

```
qa/                                         NEW at repo root (source-controlled)
├── types.ts                                TypeScript type definitions
├── index.ts                                Aggregates all definitions
├── conditions/
│   ├── auth.ts
│   ├── billing.ts
│   ├── inventory.ts
│   └── pos.ts
├── fixtures/
│   ├── accounts.ts
│   ├── products.ts
│   └── billing-states.ts
├── workflows/
│   ├── registration.ts
│   ├── complete-sale.ts
│   ├── billing.ts
│   ├── offline.ts
│   └── permissions.ts
└── CONTRIBUTING.md                         Instructions for Kiro + developers
```

Test definitions live in git because they are the living specification of StartPOS behavior. Execution results live in the `start-pos-qa-meta` database because they are runtime evidence.

### 7.4 Integration Points

```
Kiro
  └── writes/updates → qa/ definition files
                            │
                            ↓
                    apps/qa sync endpoint
                            │
                            ↓
              start-pos-qa-meta database
                            │
                            ↓
                   QA Companion Web UI
                            │
              ┌─────────────┼──────────────┐
              ↓             ↓              ↓
         Tester         Developer       Kiro
              │
              └── follows steps → opens StartPOS (localhost:3000)
                                            │
                              start-pos-qa database
                                            │
                                  fixture validation reads
```

---

## 8. Data Model (QA Metadata Database)

### 8.1 Core Entities

```prisma
// apps/qa/prisma/schema.prisma

model Feature {
  id          String       @id @default(cuid())
  key         String       @unique  // e.g., "pos", "billing", "offline"
  name        String
  description String?
  workflows   Workflow[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  @@map("features")
}

model Workflow {
  id          String     @id @default(cuid())
  featureId   String
  feature     Feature    @relation(...)
  key         String     @unique  // e.g., "pos-checkout", "subscription-lifecycle"
  name        String
  description String?
  isJourney   Boolean    @default(false)  // true = multi-step cross-feature journey
  testCases   TestCase[]
  @@map("workflows")
}

model TestCase {
  id                  String          @id @default(cuid())
  code                String          @unique  // e.g., "TC-POS-001"
  workflowId          String
  workflow            Workflow        @relation(...)
  title               String
  description         String?
  risk                Risk            // P0, P1, P2, P3
  estimatedMinutes    Int             @default(10)
  authorNotes         String?
  isDraft             Boolean         @default(true)  // draft = not visible to external testers
  isArchived          Boolean         @default(false)
  sourceFiles         String[]        // which files in StartPOS this test covers
  automatedEquivalent String?         // note about existing or planned automation
  lastSyncedAt        DateTime?       // when Kiro last updated this definition
  steps               TestStep[]
  dependencies        TestDependency[]
  fixtures            TestFixture[]
  regressionTriggers  String[]        // file paths that should trigger retest
  campaignItems       CampaignTestCase[]
  bugs                Bug[]
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt
  @@map("test_cases")
}

model TestStep {
  id                   String      @id @default(cuid())
  testCaseId           String
  testCase             TestCase    @relation(...)
  sequence             Int
  instruction          String      // Human-friendly instruction for tester
  expectedObservable   String?     // What the tester should see (shown after checkpoint)
  isCheckpoint         Boolean     @default(false)  // Stop here and ask pass/fail
  requiresEvidence     Boolean     @default(false)  // Screenshot required
  environmentNote      String?     // e.g., "Disconnect internet before this step"
  fixtureRef           String?     // Reference to a TestFixture.key for inline display
  @@map("test_steps")
}

model TestCondition {
  id              String      @id @default(cuid())
  key             String      @unique  // e.g., "cashier_logged_in"
  label           String      // e.g., "QA Cashier is logged in"
  description     String?
  resetStrategy   ResetStrategy  // AUTOMATIC, MANUAL, BEHAVIORAL, ENVIRONMENT
  requires        TestDependency[] @relation("RequiredCondition")
  establishes     TestDependency[] @relation("EstablishedCondition")
  conditionStates ConditionState[]
  @@map("test_conditions")
}

model TestDependency {
  id              String        @id @default(cuid())
  testCaseId      String
  testCase        TestCase      @relation(...)
  conditionKey    String
  condition       TestCondition @relation("RequiredCondition", ...)
  direction       DependencyDirection  // REQUIRES or ESTABLISHES
  @@unique([testCaseId, conditionKey, direction])
  @@map("test_dependencies")
}

model TestFixture {
  id          String      @id @default(cuid())
  testCaseId  String
  testCase    TestCase    @relation(...)
  key         String      // e.g., "QA_CHICKEN_MEAL"
  label       String      // e.g., "Chicken Meal product"
  type        FixtureType // ACCOUNT, PRODUCT, BRANCH, SUBSCRIPTION, INVENTORY, BILLING
  value       String      // Exact value to show tester (e.g., "qa.cashier@startpos.test")
  required    Boolean     @default(true)
  @@map("test_fixtures")
}

model TestCampaign {
  id            String            @id @default(cuid())
  name          String
  description   String?
  status        CampaignStatus    // DRAFT, ACTIVE, COMPLETED
  buildVersion  String?           // e.g., "v1.0.0-rc.3"
  gitCommit     String?           // e.g., "abc123f"
  targetDate    DateTime?
  createdBy     String            // TesterProfile.id
  creator       TesterProfile     @relation(...)
  testCases     CampaignTestCase[]
  conditionStates ConditionState[]
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt
  @@map("test_campaigns")
}

model CampaignTestCase {
  id            String        @id @default(cuid())
  campaignId    String
  campaign      TestCampaign  @relation(...)
  testCaseId    String
  testCase      TestCase      @relation(...)
  priority      Int           @default(0)   // display order within section
  section       String?       // e.g., "POS", "Billing", "Offline"
  assignedTo    String?       // TesterProfile.id (nullable = unassigned)
  assignee      TesterProfile? @relation(...)
  status        TestStatus    // LOCKED, AVAILABLE, IN_PROGRESS, PASSED, FAILED, BLOCKED, SKIPPED, RETEST_REQUIRED
  runs          TestRun[]
  @@unique([campaignId, testCaseId])
  @@map("campaign_test_cases")
}

model TestRun {
  id                    String            @id @default(cuid())
  campaignTestCaseId    String
  campaignTestCase      CampaignTestCase  @relation(...)
  testerId              String
  tester                TesterProfile     @relation(...)
  startedAt             DateTime          @default(now())
  completedAt           DateTime?
  status                RunStatus         // IN_PROGRESS, PASSED, FAILED, BLOCKED, ABANDONED
  buildVersion          String?
  gitCommit             String?
  browser               String?
  operatingSystem       String?
  fixtureSnapshot       Json?             // copy of fixture values at execution time
  conditionSnapshot     Json?             // copy of condition states at execution time
  stepResults           StepResult[]
  bug                   Bug?
  @@map("test_runs")
}

model StepResult {
  id          String      @id @default(cuid())
  testRunId   String
  testRun     TestRun     @relation(...)
  stepId      String
  step        TestStep    @relation(...)
  result      StepOutcome // PASSED, FAILED, SKIPPED, NOTE
  testerNote  String?
  timestamp   DateTime    @default(now())
  @@map("step_results")
}

model ConditionState {
  id                      String        @id @default(cuid())
  conditionKey            String
  condition               TestCondition @relation(...)
  campaignId              String
  campaign                TestCampaign  @relation(...)
  state                   ConditionStateValue  // SATISFIED, UNSATISFIED, UNKNOWN
  satisfiedByTestCaseId   String?       // which test established this
  satisfiedAt             DateTime?
  invalidatedAt           DateTime?
  invalidationReason      String?
  @@unique([conditionKey, campaignId])
  @@map("condition_states")
}

model Bug {
  id              String        @id @default(cuid())
  testRunId       String        @unique
  testRun         TestRun       @relation(...)
  testCaseId      String
  testCase        TestCase      @relation(...)
  title           String        // auto-generated from test title + step
  description     String        // tester's free-text
  severity        Risk          // P0, P1, P2, P3
  status          BugStatus     // OPEN, INVESTIGATING, FIXED, RETEST_REQUIRED, CLOSED
  buildFound      String?
  buildFixed      String?
  howFarLabel     String?       // "couldn't start" / "stuck partway" / "finished but wrong"
  screenshotUrls  String[]
  recordingUrls   String[]
  assignedTo      String?
  resolution      String?
  retestRunId     String?       // the TestRun that resolved this bug
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  @@map("bugs")
}

model TesterProfile {
  id          String      @id @default(cuid())
  email       String      @unique
  name        String
  role        TesterRole  // DEVELOPER, TESTER, EXTERNAL
  isActive    Boolean     @default(true)
  createdAt   DateTime    @default(now())
  @@map("tester_profiles")
}

// Enums
enum Risk               { P0 P1 P2 P3 }
enum ResetStrategy      { AUTOMATIC MANUAL BEHAVIORAL ENVIRONMENT }
enum DependencyDirection { REQUIRES ESTABLISHES }
enum FixtureType        { ACCOUNT PRODUCT BRANCH SUBSCRIPTION INVENTORY BILLING CUSTOMER }
enum CampaignStatus     { DRAFT ACTIVE COMPLETED }
enum TestStatus         { LOCKED AVAILABLE IN_PROGRESS PASSED FAILED BLOCKED SKIPPED RETEST_REQUIRED }
enum RunStatus          { IN_PROGRESS PASSED FAILED BLOCKED ABANDONED }
enum ConditionStateValue { SATISFIED UNSATISFIED UNKNOWN }
enum BugStatus          { OPEN INVESTIGATING FIXED RETEST_REQUIRED CLOSED }
enum StepOutcome        { PASSED FAILED SKIPPED NOTE }
enum TesterRole         { DEVELOPER TESTER EXTERNAL }
```

---

## 9. Dependency Engine Design

### 9.1 Condition Model

A `TestCondition` is a named, verifiable state of the StartPOS QA environment. Three categories:

**AUTOMATIC** — can be verified and reset by the fixture system:
```
cashier_account_exists     qa.cashier@startpos.test exists in the QA database
product_has_stock          Chicken Meal has ≥ N units in QA Main Branch inventory
subscription_active        QA business has TRIAL or ACTIVE subscription
credits_available          QA business has ≥ 1 credit in CreditLedger
```

**BEHAVIORAL** — must be established by the tester performing a real action:
```
cashier_logged_in          Tester has logged into StartPOS as the cashier
pos_session_open           A VendorSession with status=OPEN exists for QA Main Branch
online_sale_completed      At least one SALE transaction exists in the current session
product_created            Tester has created a product through the UI
```

**ENVIRONMENT** — requires external setup that the system cannot automate:
```
device_offline             Network is disconnected
printer_connected          Physical/virtual printer is reachable
mobile_device              Test is being run on a mobile browser
```

### 9.2 Condition Declaration in Test Definitions

```typescript
// qa/workflows/complete-sale.ts

export const COMPLETE_CASH_SALE: TestCase = {
  code: 'TC-POS-001',
  ...
  requires: [
    'cashier_logged_in',
    'qa_branch_exists',
    'product_has_stock',
    'subscription_active',
    'pos_session_open',
  ],
  establishes: [
    'sale_completed',
    'inventory_decreased',
    'credit_consumed',
  ],
}
```

### 9.3 Lock/Unlock Algorithm

On opening a test in the QA app:

```
1. Load TestDependency records for this TestCase (REQUIRES direction)
2. For each dependency key, look up ConditionState in the current campaign
3. If ALL states are SATISFIED → test is AVAILABLE
4. If ANY state is UNSATISFIED or UNKNOWN → test is LOCKED
5. For each unsatisfied condition:
   a. If resetStrategy = AUTOMATIC → offer "[Prepare automatically]" button
   b. If resetStrategy = BEHAVIORAL → find TestCase that ESTABLISHES this condition
      → show: "Do this first: [TC-XXX] [title]" → tappable link
   c. If resetStrategy = ENVIRONMENT → show plain instructions
6. Show tester a clear checklist (✓/✗) of each prerequisite
```

On test completion (PASSED):

```
1. Load TestDependency records (ESTABLISHES direction)
2. For each established condition:
   a. Set ConditionState.state = SATISFIED
   b. Set satisfiedByTestCaseId = this test case
   c. Set satisfiedAt = now()
3. Re-evaluate lock status of all TestCases that REQUIRE these conditions
4. If any transition from LOCKED → AVAILABLE, notify tester's session
```

On test completion (FAILED):

```
1. The test's ESTABLISHES conditions are NOT set to SATISFIED
   (a failed test did not successfully demonstrate the condition)
2. Conditions established by prior passing runs remain SATISFIED
   (historical results are not retroactively invalidated)
3. Create a Bug record
```

On fixture reset:

```
1. AUTOMATIC conditions: re-validate against the QA database → update to SATISFIED/UNSATISFIED
2. BEHAVIORAL conditions: reset to UNKNOWN (the tester must re-establish them)
3. ENVIRONMENT conditions: no change (system cannot know the environment state)
4. Re-evaluate all test lock states
```

### 9.4 Availability State Machine

```
                 ┌────────────────┐
                 │     LOCKED     │  ← one or more REQUIRES conditions are UNSATISFIED
                 └───────┬────────┘
                          │ all conditions satisfied
                          ▼
                 ┌────────────────┐
                 │   AVAILABLE    │  ← ready to run
                 └───────┬────────┘
                          │ tester begins
                          ▼
                 ┌────────────────┐
                 │  IN_PROGRESS   │  ← wizard is open
                 └───────┬────────┘
               ┌─────────┼─────────┐
          PASS ▼         ▼ FAIL    ▼ BLOCKED
        ┌──────┐     ┌──────┐   ┌──────┐
        │PASSED│     │FAILED│   │BLOCK-│
        └──────┘     └──┬───┘   │  ED  │
                         │       └──────┘
                         │ fix deployed + marked by developer
                         ▼
               ┌───────────────────┐
               │  RETEST_REQUIRED  │
               └───────────────────┘
```

---

## 10. Fixture System Design

### 10.1 Three Fixture Categories

| Category | Examples | Who Prepares | Can Auto-Reset? |
|---|---|---|---|
| **Behavioral** | Registration, product creation, first login | Tester (through StartPOS) — this IS the test | No |
| **Automatic** | Accounts, products, inventory, subscription state | QA infrastructure | Yes — `[Reset QA Environment]` |
| **Environment** | Offline mode, printer, mobile device | Tester (external action) | No |

### 10.2 QA Seed Dataset Plan

New CSV folder: `packages/platform/prisma/seeders/csv/qa/`

**Accounts (`qa/accounts.csv`)**

| ID | Email | Role | Name | Business | Branch |
|---|---|---|---|---|---|
| `qa-owner-1` | `qa.owner@startpos.test` | ADMIN | QA Owner | StartPOS QA Store | QA Main Branch |
| `qa-manager-1` | `qa.manager@startpos.test` | SUPERVISOR | QA Manager | StartPOS QA Store | QA Main Branch |
| `qa-cashier-1` | `qa.cashier@startpos.test` | CASHIER | QA Cashier | StartPOS QA Store | QA Main Branch |
| `qa-inventory-1` | `qa.inventory@startpos.test` | SUPERVISOR | QA Inventory Clerk | StartPOS QA Store | QA Secondary Branch |

**Business + Branches**

| ID | Name | Type | Notes |
|---|---|---|---|
| `qa-biz-1` | StartPOS QA Store | RETAIL | Primary QA business |
| `qa-branch-1` | QA Main Branch | — | Primary test branch |
| `qa-branch-2` | QA Secondary Branch | — | Multi-branch tests |
| `qa-branch-3` | QA Offline Branch | — | Offline mode tests; `offlineTerminalId = qa-cashier-1` |

**Products (`qa/product-variants.csv`)**

| SKU | Name | Price | Initial Stock | Category |
|---|---|---|---|---|
| QA-CHICKEN-001 | Chicken Meal | ₱145.00 (14500 cents) | 50 | QA Main Dishes |
| QA-COKE-001 | Coke Regular | ₱45.00 (4500 cents) | 100 | QA Beverages |
| QA-FRIES-001 | French Fries | ₱75.00 (7500 cents) | 80 | QA Snacks |
| QA-TEST-A | QA Test Product A | ₱100.00 (10000 cents) | 30 | QA Test Items |
| QA-TEST-B | QA Test Product B | ₱200.00 (20000 cents) | 20 | QA Test Items |
| QA-LOW-STOCK | QA Low Stock Item | ₱50.00 (5000 cents) | 2 | QA Test Items |
| QA-ZERO-STOCK | QA Out of Stock Item | ₱50.00 (5000 cents) | 0 | QA Test Items |

Password for all QA accounts: `QA-Test-2026!` (distinct from the e2e dataset password `123qwe123!1`)

### 10.3 Fixture Validation Screen

Before the test wizard begins, the QA app shows a checklist:

```
Preparing: Complete a Cash Sale

Checking requirements...

✓ QA Cashier account (qa.cashier@startpos.test) — found
✓ QA Main Branch — found
✓ Chicken Meal (QA-CHICKEN-001) — found, price ₱145.00
✓ Stock ≥ 2 — 47 units available
✓ Subscription — Trial active (47 credits remaining)
✗ POS session — no open session found in QA Main Branch

─────────────────────────────────────────────
2 things need attention before you can start:

✗ You need to open a POS session first.
  How: Log in as qa.cashier@startpos.test and open the POS.

[Check again]     [Prepare automatically where possible]
```

### 10.4 Fixture Reset Mechanism

The `environment-reset.ts` server function in `apps/qa`:

1. Accepts `resetScope`: `ACCOUNTS` | `INVENTORY` | `SUBSCRIPTION` | `ALL`
2. Runs the appropriate portion of the QA seeder against `QA_DATABASE_URL`
3. Uses `prisma db push --force-reset` only for `ALL` scope (full reset)
4. For partial scopes, uses Prisma upsert operations directly
5. Revalidates all AUTOMATIC conditions and updates `ConditionState` records
6. Returns a summary: what was reset, new fixture state

This function is only callable from the Environment admin page in the QA app. It is not exposed as a general endpoint.

---

## 11. Tester UX Design

### 11.1 View Modes

**External Tester Mode** (default for non-developer accounts):
- Plain language throughout, no technical terms
- Large tap targets, wizard-style flow
- No IDs, keys, or database concepts visible
- "Something went wrong" → simple text box

**Developer Mode** (toggled in profile, default for DEVELOPER role):
- Technical metadata visible inline: condition keys, fixture IDs, source file references
- JSON snapshots expandable
- Linked to test definition source file in the repo

### 11.2 Campaign Dashboard — Non-Technical View

```
┌────────────────────────────────────────────────────────────────┐
│  StartPOS QA — V1 Certification                     ⚠️ QA ENV │
│                                                                  │
│  Progress: ████████░░░░  42 of 89 tests complete              │
│                                                                  │
│  YOUR TESTS                                                     │
│  ─────────────────────────────────────────────────────────    │
│  ✓ Login as Cashier                                  PASSED   │
│  ✓ Open POS Session                                  PASSED   │
│  ▶ Complete a Cash Sale                         START NOW →   │
│  ○ Complete a Card Sale              Waiting (login ✓)        │
│  ○ Refund a Sale                     Waiting (sale ✓)         │
│  🔒 Offline Sale                     Locked (need online sale) │
│                                                                  │
│  [Start next test]                                              │
└────────────────────────────────────────────────────────────────┘
```

### 11.3 Test Execution Wizard

```
┌────────────────────────────────────────────────────────────────┐
│  Complete a Cash Sale                           Step 3 of 7   │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  Add Chicken Meal to the cart.                                 │
│                                                                  │
│  Look for: Chicken Meal — ₱145.00                             │
│  (Under: Main Dishes)                                          │
│                                                                  │
│  Tap the product card to add it.                               │
│                                                                  │
│  ┌──────────────────────────────────┐                         │
│  │  Open StartPOS →                 │  (opens localhost:3000) │
│  └──────────────────────────────────┘                         │
│                                                                  │
│  [I've done this — continue]   [Something went wrong]         │
└────────────────────────────────────────────────────────────────┘
```

Checkpoint step (after a step with `isCheckpoint: true`):

```
┌────────────────────────────────────────────────────────────────┐
│  Complete a Cash Sale                           Step 4 of 7   │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  Tap Checkout.                                                  │
│                                                                  │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  What should appear:                                           │
│  A checkout screen showing ₱290.00 as the total.              │
│                                                                  │
│  Did that happen?                                              │
│                                                                  │
│  [Yes, I see ₱290.00 — continue]                              │
│  [No — the amount was wrong or nothing appeared]               │
└────────────────────────────────────────────────────────────────┘
```

### 11.4 Failure Reporting Form

```
┌────────────────────────────────────────────────────────────────┐
│  Tell us what went wrong                                        │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  What did you see or what happened?                            │
│  ┌────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [Add a screenshot]   [Add a screen recording]                 │
│                                                                  │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  How far did you get?                                          │
│  ○ Couldn't start the test at all                              │
│  ○ Got stuck partway through                                   │
│  ○ Finished, but the result looked wrong                       │
│                                                                  │
│  [Report this problem]                                          │
└────────────────────────────────────────────────────────────────┘
```

### 11.5 Locked Test Screen

```
┌────────────────────────────────────────────────────────────────┐
│  🔒  Offline Sale — not ready yet                              │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  This test needs some things to be ready first:                │
│                                                                  │
│  ✓ You're logged in as cashier                                 │
│  ✓ QA branch is set up                                         │
│  ✗ You need to complete an online sale first                   │
│                                                                  │
│  ─────────────────────────────────────────────────────────    │
│                                                                  │
│  Do this test first:                                           │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐   │
│  │  TC-POS-001 · Complete a Cash Sale               →     │   │
│  └────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Once that passes, this test will unlock automatically.        │
└────────────────────────────────────────────────────────────────┘
```

---

## 12. Kiro Integration

### 12.1 Kiro's Role

Kiro is the intelligence layer that inspects StartPOS and produces test definitions. Humans can refine what Kiro generates. The QA app syncs those definitions into the metadata database and makes them executable.

Kiro inspects:
- Routes and pages (`apps/web/src/routes/`)
- Server functions (`apps/web/src/lib/queries/`, `server-fn/`)
- Business engines (`apps/web/src/lib/billing/`, `inventory/`, etc.)
- Prisma schema (all models and relationships)
- Permission keys (`packages/platform/lib/authorization/permission-keys.ts`)
- Entitlement engine (`packages/platform/lib/entitlement/`)
- Capability keys
- Existing seed data structure (to know what test data is available)
- The `V1-CERTIFICATION-MATRIX.md` for known gaps

### 12.2 Test Definition TypeScript Format

```typescript
// qa/workflows/complete-sale.ts

import type { TestCase } from '../types'

export const COMPLETE_CASH_SALE: TestCase = {
  code: 'TC-POS-001',
  title: 'Complete a Cash Sale',
  description:
    'A cashier processes a normal cash sale: product selection, cash payment, receipt.',
  feature: 'pos',
  workflow: 'pos-checkout',
  risk: 'P0',
  isDraft: false,                    // set true until manually validated

  sourceFiles: [
    'apps/web/src/routes/(private)/pos/index.tsx',
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/queries/create-pos-order.ts',
  ],
  engines: [
    'apps/web/src/lib/inventory/inventory-engine.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
  ],
  models: ['Transaction', 'Order', 'Payment', 'Inventory', 'CreditLedger'],

  requires: [
    'cashier_logged_in',
    'qa_branch_exists',
    'product_has_stock',
    'subscription_active',
    'pos_session_open',
  ],
  establishes: [
    'sale_completed',
    'inventory_decreased',
    'credit_consumed',
  ],

  fixtures: [
    {
      key: 'QA_CASHIER_ACCOUNT',
      label: 'QA Cashier login',
      type: 'ACCOUNT',
      value: 'qa.cashier@startpos.test',
    },
    {
      key: 'QA_CASHIER_PASSWORD',
      label: 'Password',
      type: 'ACCOUNT',
      value: 'QA-Test-2026!',
    },
    {
      key: 'QA_CHICKEN_MEAL',
      label: 'Chicken Meal (QA-CHICKEN-001) — ₱145.00',
      type: 'PRODUCT',
      value: 'QA-CHICKEN-001',
    },
    {
      key: 'QA_MAIN_BRANCH',
      label: 'QA Main Branch',
      type: 'BRANCH',
      value: 'qa-branch-1',
    },
  ],

  steps: [
    {
      sequence: 1,
      instruction: 'Log in to StartPOS as qa.cashier@startpos.test.',
      isCheckpoint: false,
    },
    {
      sequence: 2,
      instruction: 'Open the POS screen.',
      isCheckpoint: false,
    },
    {
      sequence: 3,
      instruction: 'Find Chicken Meal (₱145.00) in the product list and tap it to add it to the cart.',
      fixtureRef: 'QA_CHICKEN_MEAL',
      isCheckpoint: false,
    },
    {
      sequence: 4,
      instruction: 'Set the quantity to 2.',
      isCheckpoint: false,
    },
    {
      sequence: 5,
      instruction: 'Tap Checkout.',
      isCheckpoint: true,
      expectedObservable:
        'A checkout screen appears showing a total of ₱290.00.',
    },
    {
      sequence: 6,
      instruction: 'Select Cash as the payment method and enter ₱500 as the tendered amount.',
      isCheckpoint: false,
    },
    {
      sequence: 7,
      instruction: 'Tap "Complete Payment".',
      isCheckpoint: true,
      expectedObservable:
        'A success screen appears. Change shown is ₱210.00. A receipt is visible.',
    },
  ],

  expectedResult:
    'The sale completes. A receipt is generated and the transaction appears in history.',

  regressionTriggers: [
    'apps/web/src/lib/queries/create-pos-transaction.ts',
    'apps/web/src/lib/queries/create-pos-order.ts',
    'apps/web/src/lib/billing/credit-engine.ts',
    'apps/web/src/lib/inventory/inventory-engine.ts',
  ],

  estimatedMinutes: 8,
}
```

### 12.3 Draft Protection

Tests with `isDraft: true` are:
- Visible to DEVELOPER-role testers (with a "Draft" badge)
- Hidden from TESTER and EXTERNAL-role testers
- Not counted in the V1 certification gate

This prevents Kiro-generated tests from reaching external testers before a developer has manually validated the steps.

### 12.4 Sync Mechanism

On QA app startup (or via a manual "Sync definitions" button):

1. Import all definitions from `qa/index.ts`
2. For each `TestCase`:
   - If no DB record with this `code` → create it
   - If DB record exists and definition has changed → update it (non-destructively: preserve historical results)
   - If DB record exists but definition was removed → mark `isArchived = true`
3. Update `lastSyncedAt` timestamp on each synced record
4. Return sync summary

---

## 13. Regression System

### 13.1 V1 Scope: Explicit Tagging + Build Association

Automated code-to-test impact analysis is deferred. The V1 approach is:

1. Each test case declares `regressionTriggers` — a list of source file paths
2. Developer reports a change: enters changed files or a git commit hash
3. QA app matches against `regressionTriggers` across all test cases
4. Matching tests are marked `RETEST_REQUIRED` in the active campaign
5. Developer sees: "12 tests are potentially affected by this change"

This is honest and reliable. A wrong regression system (one that triggers on everything or misses things) would be worse than this explicit approach.

### 13.2 Build Association

Every `TestRun` stores `buildVersion` and `gitCommit`. The campaign view shows:

```
TC-POS-001  PASSED  on abc123f  (4 days ago)
            ⚠️ Code changes since this result may affect this test:
               create-pos-transaction.ts was modified in def456a
            → Marked for retest
```

### 13.3 Future Enhancements (Post-Phase 1)

- Webhook from git that auto-extracts changed files and triggers regression tagging
- Module dependency graph to infer indirect impacts
- Automatic `RETEST_REQUIRED` when a dependency changes

---

## 14. Bug Workflow

### 14.1 Lifecycle

```
OPEN → INVESTIGATING → FIXED → RETEST_REQUIRED → RETEST_PASSED → CLOSED
                                               ↘ RETEST_FAILED → OPEN
```

### 14.2 Auto-Captured Evidence

When a tester submits "Something went wrong":

```
Automatically captured:
  testCaseCode, testCaseTitle
  campaignId, campaignName
  testerId, testerName
  timestamp
  buildVersion, gitCommit
  browser (navigator.userAgent)
  operatingSystem
  fixtureSnapshot (what data was present at execution time)
  conditionSnapshot (what conditions were satisfied)
  completedSteps (which steps passed before the failure)
  currentStep (which step failed)
  expectedObservable for the current step

Tester-provided:
  free-text description
  howFar selection (couldn't start / stuck partway / finished but wrong)
  screenshots (file upload)
  screen recording (file upload)
```

### 14.3 Developer Bug View

```
BUG-042  ·  TC-POS-001 Complete a Cash Sale  ·  P0 CRITICAL

Reported by: Maria Cruz  |  Build: abc123f  |  Sep 6 2026 14:22

"The total showed ₱100 instead of ₱290"

Failed at: Step 5 — Tap Checkout
Expected: "A checkout screen appears showing a total of ₱290.00"

Fixture state at failure:
  QA Cashier: ✓  |  Chicken Meal: ✓  |  Stock: 47  |  Credits: 47

Steps completed before failure:
  ✓ Step 1: Logged in
  ✓ Step 2: Opened POS
  ✓ Step 3: Added Chicken Meal
  ✓ Step 4: Set quantity to 2

Browser: Chrome 127 / Windows 11

[View screenshot]  [Mark as Investigating]  [Link to commit]
```

---

## 15. V1 Release Certification

### 15.1 Release Gates

V1 is blocked unless ALL of the following are true:

1. All P0 tests are PASSED (or explicitly marked ACCEPTED_RISK with a written reason)
2. All P0 tests were passed on the current build version
3. Zero open P0 bugs
4. Zero P0 test cases that have never been executed
5. P1 tests: 100% pass rate or all open P1 bugs have documented workarounds

### 15.2 Certification Dashboard

```
┌────────────────────────────────────────────────────────────────┐
│  V1 CERTIFICATION                            Build: v1.0.0-rc.3│
│                                                                  │
│  🔴 NOT READY — 2 blockers                                      │
│                                                                  │
│  BLOCKERS                                                       │
│  ─────────────────────────────────────────────────────────    │
│  1.  TC-OFFLINE-001 Offline Sale — never executed (P0)        │
│  2.  BUG-042 Cash sale shows wrong total (P0, open)           │
│                                                                  │
│  COVERAGE                                                       │
│  ─────────────────────────────────────────────────────────    │
│  P0 Critical   12 / 14 ████████░░  86%                        │
│  P1 High       23 / 27 █████████░  85%                        │
│  P2 Medium     31 / 40 ███████░░░  78%                        │
│  P3 Low        15 / 22 ██████░░░░  68%                        │
│                                                                  │
│  [View all tests]   [View open bugs]   [Export report]         │
└────────────────────────────────────────────────────────────────┘
```

---

## 16. Security and Environment Isolation

### 16.1 Database Isolation

| Database | URL Env Var | Who Uses It | Destroyed On Reset? |
|---|---|---|---|
| `start-pos` | `DATABASE_URL` | StartPOS dev app | Manually by developer |
| `start-pos-test` | `TEST_POSTGRES_DB` | DELETED with old tests | Drop this database |
| `start-pos-qa` | `QA_DATABASE_URL` | StartPOS running in QA mode + QA app fixture validator | Yes, on `[Reset QA Environment]` |
| `start-pos-qa-meta` | `QA_META_DATABASE_URL` | QA app metadata only | No — never reset |

### 16.2 Credential Safety

- QA accounts use `@startpos.test` domain — visually unmistakable from real accounts
- QA password `QA-Test-2026!` is different from the e2e dataset password
- QA app displays a persistent `⚠️ QA ENVIRONMENT` banner on every screen
- QA app explicitly states "All data is disposable — do not enter real personal information"
- Production Stripe keys, real Resend API keys, and production database URLs are never referenced in `apps/qa`
- The QA app's own `package.json` does not list Stripe or Resend as dependencies

### 16.3 QA vs. Production

The QA app is never deployed as part of the production StartPOS release. It is a developer/testing tool only. When the developer wants a non-technical tester to use it, they either:
- Share access to a locally-running instance on the developer's machine
- Deploy it separately to a non-production URL (e.g., `qa-internal.startpos.dev`)

---

## 17. Implementation Phases

Each phase is designed to be independently releasable and immediately useful.

---

### Phase 1 — Deprecation Cleanup

**Objective:** Remove the obsolete test infrastructure from the repository and create the clean starting point.

**Duration estimate:** 1 day

**Do not implement yet — this is planned work.**

**Actions:**

1. Move `apps/web/__tests__/e2e/V1-CERTIFICATION-MATRIX.md` → `docs/qa-history/v1-certification-matrix-original.md`
2. Delete `apps/web/__tests__/` (entire directory)
3. Delete `apps/web/vitest.config.ts`
4. Delete `apps/web/vitest.integration.config.ts`
5. Delete `apps/web/tsconfig.test.json`
6. Delete `apps/web/playwright.config.ts`
7. Delete `apps/web/src/test-setup.ts`
8. Remove from `apps/web/package.json` devDependencies: `@faker-js/faker`, `@playwright/test`, `@testing-library/dom`, `@testing-library/jest-dom`, `@testing-library/react`, `@vitest/coverage-v8`, `canvas`, `jsdom`, `type-coverage`
9. Remove from `apps/web/package.json` scripts: `test`, `test:integration`, `coverage`, `coverage:integration`, `coverage:all`, `pretest:e2e`, `test:e2e`, `test:e2e:ui`, `test:e2e:headed`, `test:e2e:clean`, `type-coverage`, `type-coverage:report`, `validate`
10. Remove `TEST_POSTGRES_DB` from `.env.local` and `.env.local.example`
11. Remove `test:integration` task from `turbo.json`
12. Remove `test` task inputs/outputs from `turbo.json` (or leave as empty skeleton)
13. Create `docs/` directory at repo root if it doesn't exist
14. Create `docs/qa-history/` directory

**Expected outcome:** The web app has no obsolete test baggage. `pnpm install` in `apps/web` is faster. No ghost configuration files pointing to files that don't exist.

**Validation:** `pnpm build:web` succeeds. `pnpm type-check` passes. The removed files are no longer referenced anywhere.

---

### Phase 2 — QA App Scaffold + Environment Infrastructure

**Objective:** Create the `apps/qa` application, the QA databases, and the QA seeder. By the end of this phase, a developer can run the QA app and see a working environment status page showing the QA fixture state.

**Duration estimate:** 3–4 days

**Tasks:**

1. Create `apps/qa/package.json` — name `@startpos/qa`, port 3001, same stack as `apps/admin`
2. Create `apps/qa/vite.config.ts`, `tsconfig.json`
3. Create `apps/qa/prisma.config.ts` pointing to `QA_META_DATABASE_URL`
4. Create `apps/qa/prisma/schema.prisma` with the full QA metadata schema (§8.1)
5. Add `apps/qa` to `pnpm-workspace.yaml`
6. Add qa build/dev tasks to `turbo.json`
7. Add `QA_DATABASE_URL`, `QA_META_DATABASE_URL`, `STARTPOS_URL` to `.env.example` and `.env.local.example`
8. Create `packages/platform/prisma/seeders/csv/qa/` with all CSV files
9. Register `qa` as a valid seed folder in `packages/platform/prisma/db-script-utils.ts`
10. Add `pnpm seed:qa` script to root `package.json`
11. Create `apps/qa/src/lib/qa-prisma/index.ts` — two named Prisma clients: `qaAppPrisma` (reads `QA_DATABASE_URL`) and `qaMetaPrisma` (reads `QA_META_DATABASE_URL`)
12. Create `apps/qa/src/lib/fixture-validator/index.ts` — validates QA DB state for each condition type
13. Create basic router and routes: `__root.tsx`, login, dashboard, environment
14. Create the environment admin page: shows fixture validation results, `[Reset QA Environment]` button
15. Wire `environment-reset.ts` server function to the seeder

**Files to create (key):**
```
apps/qa/package.json
apps/qa/vite.config.ts
apps/qa/tsconfig.json
apps/qa/prisma.config.ts
apps/qa/prisma/schema.prisma
apps/qa/src/router.tsx
apps/qa/src/routes/__root.tsx
apps/qa/src/routes/(public)/login.tsx
apps/qa/src/routes/(private)/dashboard.tsx
apps/qa/src/routes/(private)/environment/index.tsx
apps/qa/src/lib/qa-prisma/index.ts
apps/qa/src/lib/fixture-validator/index.ts
apps/qa/src/lib/server-fn/environment-reset.ts
packages/platform/prisma/seeders/csv/qa/accounts.csv
packages/platform/prisma/seeders/csv/qa/categories.csv
packages/platform/prisma/seeders/csv/qa/units.csv
packages/platform/prisma/seeders/csv/qa/product-variants.csv
packages/platform/prisma/seeders/csv/qa/inventory.csv
packages/platform/prisma/seeders/csv/qa/system-configs.csv
packages/platform/prisma/seeders/csv/qa/suppliers.csv
docs/qa-history/ (from Phase 1)
```

**Files to modify:**
```
pnpm-workspace.yaml
turbo.json
.env.example
.env.local.example
packages/platform/prisma/db-script-utils.ts
package.json (root scripts)
```

**Validation:** `pnpm dev:qa` starts the QA app on port 3001. Environment page shows fixture validation results against the QA database.

---

### Phase 3 — Test Definition Format + First Test Cases

**Objective:** Define the TypeScript test definition format, create the `qa/` root directory, and write the first 20+ test cases covering all P0 workflows.

**Duration estimate:** 3–4 days

**Tasks:**

1. Create `qa/types.ts` with all type definitions
2. Create `qa/conditions/` — define all conditions with validation logic
3. Create `qa/fixtures/` — define all fixture references
4. Write first test cases (P0 priority):

   | Code | Title | Risk |
   |---|---|---|
   | TC-AUTH-001 | Login as QA Cashier | P0 |
   | TC-AUTH-002 | Login as QA Owner | P0 |
   | TC-AUTH-003 | Login fails with wrong password | P1 |
   | TC-REG-001 | Register a new business | P0 |
   | TC-REG-002 | Complete onboarding survey | P0 |
   | TC-PROD-001 | Create a product | P1 |
   | TC-INV-001 | Add inventory to a product | P1 |
   | TC-POS-001 | Complete a cash sale | P0 |
   | TC-POS-002 | Complete a card/e-wallet sale | P0 |
   | TC-POS-003 | Refund a completed sale | P0 |
   | TC-BILL-001 | View trial status and credit balance | P0 |
   | TC-BILL-002 | Purchase additional credits | P1 |
   | TC-BILL-003 | Subscription upgrade from trial | P0 |
   | TC-BILL-004 | Transaction limit reached behavior | P0 |
   | TC-BILL-005 | Credits exhausted behavior | P0 |
   | TC-PERM-001 | Cashier cannot access admin settings | P0 |
   | TC-PERM-002 | Supervisor can approve tasks | P1 |
   | TC-INV-002 | Inventory deducted after sale | P0 |
   | TC-OFFLINE-001 | Complete a sale in offline mode | P0 |
   | TC-SYNC-001 | Offline sale synchronizes after reconnection | P0 |
   | TC-PO-001 | Create and approve a purchase order | P1 |
   | TC-GRN-001 | Receive goods and update inventory | P1 |

   All cases start with `isDraft: true` until manually validated.

5. Create `qa/index.ts` that exports all definitions
6. Create `apps/qa/src/lib/sync-definitions/index.ts` that syncs `qa/` → meta DB
7. Create a sync endpoint in the QA app
8. Verify test cases appear in the QA app

**Important:** Steps should be written only after manually walking through the flow in the running StartPOS app. Do not write final steps speculatively. Keep `isDraft: true` on any test whose steps have not been manually validated.

---

### Phase 4 — Guided Execution Wizard

**Objective:** Build the core tester experience. A tester can open a test and follow it step by step.

**Duration estimate:** 4–5 days

**Tasks:**

1. Create `apps/qa/src/routes/(private)/execute/$testCaseCode.tsx`
2. Implement the step wizard:
   - Progress indicator (`Step X of Y`)
   - Step instruction with fixture values inline
   - "Open StartPOS" button (configured `STARTPOS_URL`)
   - "I've done this" and "Something went wrong" buttons
   - Checkpoint steps show expected observable after tester passes previous step
   - Environment notes shown prominently (e.g., "Disconnect internet before this step")
3. Implement the fixture validation checklist shown before the wizard starts
4. Create `TestRun` server function — creates run record on wizard open
5. Create `StepResult` server function — records each step outcome
6. Implement the failure reporting form (free text + screenshot upload + "how far" selector)
7. Create `Bug` server function — creates bug record on failure submission
8. Implement `ConditionState` updates on test completion (PASSED → marks ESTABLISHES conditions)
9. Create the test detail view: fixture checklist, steps preview, expected result

**Screenshot approach:** Use a file `<input type="file" accept="image/*">` as the primary mechanism. Store locally in Phase 4; cloud storage can be added in a later phase.

---

### Phase 5 — Campaign Management + Dependency Engine

**Objective:** Testers see a coherent campaign view. Locked tests show what they need. Completing a test unlocks dependent tests.

**Duration estimate:** 3–4 days

**Tasks:**

1. Implement `DependencyEngine` in `apps/qa/src/lib/dependency-engine/`
2. Wire `ConditionState` reads into the test list (LOCKED / AVAILABLE badges)
3. Implement the "locked test" screen with prerequisite test navigation
4. Build campaign management screens:
   - Create campaign (name, build version, git commit, target date)
   - Add test cases by section (POS, Billing, Offline, etc.)
   - Assign testers to sections
5. Build the "Your tests today" view: sorted by risk + availability + assigned section
6. Implement the V1 Certification dashboard with release gate computation
7. Implement "What should I test next?" queue logic

---

### Phase 6 — Regression Tagging + Bug Lifecycle

**Objective:** Developers can mark code changes and see which tests are affected. Bugs have a full lifecycle.

**Duration estimate:** 3 days

**Tasks:**

1. Build the "Report a code change" screen: enter changed files or git commit SHA
2. Implement `regressionTriggers` matching → `RETEST_REQUIRED` propagation
3. Build the bug detail view with all auto-captured technical metadata
4. Implement bug status transitions (OPEN → INVESTIGATING → FIXED → RETEST_REQUIRED)
5. Implement "mark as fixed" from a bug record → marks the corresponding test as `RETEST_REQUIRED`
6. Build the developer dashboard: open bugs by severity, tests needing retest, coverage summary

---

### Phase 7 — Kiro Test Generation Workflow

**Objective:** Kiro can be invoked to inspect a StartPOS feature area and generate or update test case definitions.

**Duration estimate:** 4 days (iterative)

**Tasks:**

1. Write `qa/CONTRIBUTING.md` — explains the test definition format, condition registration, fixture registration, and `isDraft` workflow
2. Define the Kiro prompt template for generating test cases from a given file or feature area
3. Implement generation of missing conditions and fixtures when Kiro adds a new test case
4. Implement `lastSyncedAt` staleness detection: flag test cases not synced in 30+ days
5. Add "generated by Kiro" attribution to auto-generated definitions
6. Implement the automated coverage comparison view: which test cases have automated equivalents, which don't

---

## 18. File-Level Changes Summary

### New (apps/qa)

```
apps/qa/package.json
apps/qa/vite.config.ts
apps/qa/tsconfig.json
apps/qa/prisma.config.ts
apps/qa/prisma/schema.prisma
apps/qa/src/router.tsx
apps/qa/src/routes/__root.tsx
apps/qa/src/routes/(public)/login.tsx
apps/qa/src/routes/(private)/dashboard.tsx
apps/qa/src/routes/(private)/campaigns/index.tsx
apps/qa/src/routes/(private)/campaigns/$campaignId/index.tsx
apps/qa/src/routes/(private)/execute/$testCaseCode.tsx
apps/qa/src/routes/(private)/bugs/index.tsx
apps/qa/src/routes/(private)/environment/index.tsx
apps/qa/src/routes/(private)/developer/index.tsx
apps/qa/src/lib/qa-prisma/index.ts
apps/qa/src/lib/fixture-validator/index.ts
apps/qa/src/lib/dependency-engine/index.ts
apps/qa/src/lib/sync-definitions/index.ts
apps/qa/src/lib/server-fn/test-run.ts
apps/qa/src/lib/server-fn/bug.ts
apps/qa/src/lib/server-fn/campaign.ts
apps/qa/src/lib/server-fn/environment-reset.ts
apps/qa/src/styles.css
```

### New (qa/ root directory)

```
qa/types.ts
qa/index.ts
qa/conditions/auth.ts
qa/conditions/billing.ts
qa/conditions/inventory.ts
qa/conditions/pos.ts
qa/conditions/offline.ts
qa/fixtures/accounts.ts
qa/fixtures/products.ts
qa/fixtures/billing-states.ts
qa/workflows/registration.ts
qa/workflows/complete-sale.ts
qa/workflows/billing.ts
qa/workflows/offline.ts
qa/workflows/permissions.ts
qa/workflows/inventory.ts
qa/CONTRIBUTING.md
```

### New (seeder CSV)

```
packages/platform/prisma/seeders/csv/qa/accounts.csv
packages/platform/prisma/seeders/csv/qa/categories.csv
packages/platform/prisma/seeders/csv/qa/units.csv
packages/platform/prisma/seeders/csv/qa/product-variants.csv
packages/platform/prisma/seeders/csv/qa/inventory.csv
packages/platform/prisma/seeders/csv/qa/system-configs.csv
packages/platform/prisma/seeders/csv/qa/suppliers.csv
```

### New (docs)

```
docs/qa-history/v1-certification-matrix-original.md  (moved from __tests__/e2e/)
```

### Modified

```
pnpm-workspace.yaml                         add apps/qa
turbo.json                                  add qa tasks, clean up deprecated test tasks
.env.example                                add QA_DATABASE_URL, QA_META_DATABASE_URL, STARTPOS_URL
.env.local.example                          same; remove TEST_POSTGRES_DB
packages/platform/prisma/db-script-utils.ts  register qa as valid seed folder
package.json (root)                         add seed:qa script
```

### Deleted (Phase 1 cleanup — not yet, planning only)

```
apps/web/__tests__/         entire directory
apps/web/vitest.config.ts
apps/web/vitest.integration.config.ts
apps/web/tsconfig.test.json
apps/web/playwright.config.ts
apps/web/src/test-setup.ts
```

### Explicitly Not Modified

```
apps/web/src/             No changes to any StartPOS application code
packages/platform/lib/    No changes to any business engines or APIs
packages/platform/prisma/schema.prisma  No changes to the main database schema
apps/admin/               Untouched
```

---

## 19. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Step instructions are wrong because the flow hasn't been manually validated | High (inherent) | High | `isDraft: true` guard prevents unvalidated tests from reaching external testers. Developer must manually walk each flow before setting `isDraft: false`. |
| QA environment becomes corrupted by a tester accidentally modifying data | Medium | Medium | `[Reset QA Environment]` is always available. Full reset takes ~2 minutes. |
| QA metadata DB schema needs to evolve significantly during implementation | Medium | Medium | Schema is internal to `apps/qa`, never shared with other apps. Can migrate freely pre-launch. |
| Two Prisma clients in one app causes confusion during development | Low | Low | Name them unambiguously: `qaAppPrisma` and `qaMetaPrisma`. Document clearly in `qa/CONTRIBUTING.md`. |
| The `STARTPOS_URL` env var is misconfigured and testers can't navigate to the app | Low | Medium | Default to `http://localhost:3000`. Document clearly. Show the URL prominently in the QA app header. |
| Non-technical tester confuses QA StartPOS with production | Low | High | Persistent `⚠️ QA ENVIRONMENT` banner. Distinct QA email addresses. Explicit "this data is disposable" messaging. |
| Kiro generates tests with incorrect step instructions before manual validation | Medium | High | `isDraft: true` is the gate. Developer reviews before publishing. Kiro should always set `isDraft: true` on new generation. |
| The old test database `start-pos-test` is dropped before anyone saves anything important from it | Very low | Very low | The old integration tests encoded potentially wrong behavior. Nothing in them should be considered a source of truth. Drop it. |

---

## 20. Open Questions

These require explicit product/architectural decisions before implementation of the affected phases can proceed.

**Q1. QA app hosting for external testers**
Should the QA app and the StartPOS QA instance be hosted on a network-accessible URL (not just localhost) so a non-technical tester can use their own device? If yes, this impacts Phase 2 (we need a hosted QA database) and Phase 4 (screenshot storage needs a cloud bucket rather than local filesystem).

**Q2. Screenshot and recording storage**
Where do files submitted by testers get stored?
- Option A: Local filesystem (dev only; acceptable if testing is always on the developer's machine)
- Option B: R2/S3 bucket (enables remote testers; small operational cost)
- Option C: Stored as base64 in the database (simple but not scalable for recordings)

For Phase 4, Option A is sufficient if testing is local. Decide before Phase 4 implementation.

**Q3. QA app authentication**
Should the QA app have its own Better Auth instance pointing at the QA meta database? Or should it use a simpler shared-secret approach (e.g., a single developer password in the environment config) since this is an internal tool?

The simplest viable approach for V1: a single hardcoded developer password in the environment + TesterProfile records seeded via migration. Better Auth adds complexity that isn't needed until the app is multi-user across the internet.

**Q4. Multiple active campaigns**
Can there be more than one active campaign simultaneously (e.g., "V1 Certification" and "Regression after billing fix")? Or is there always exactly one active campaign?

Single active campaign is simpler to implement and likely sufficient for V1. Decide before Phase 5 implementation.

**Q5. Automated test integration timeline**
When the fresh automated test suite is eventually rebuilt, should it write results to the QA meta database (so automated and manual results appear together in the V1 gate)? If yes, the schema needs an `executionType` field on `TestRun`. This can be added non-destructively when the time comes — no action needed now.

---

## 21. Recommendation

### Architecture Verdict

Build `apps/qa` inside the monorepo. Share `@startpos/platform` for database access, auth, and the seeder pipeline. Keep the QA metadata in its own `start-pos-qa-meta` database so fixture resets never destroy test history.

The hybrid source-control + database design (test definitions in `qa/`, execution records in the database) is the correct model. Kiro maintains the definitions; the database stores the evidence.

### Sequencing Recommendation

**Start with Phase 1 (Deprecation Cleanup).** Removing the obsolete test infrastructure is a prerequisite because:
- It eliminates confusion about which tests "count"
- It removes dead configuration that would confuse new test infrastructure setup
- It is low-risk and takes one day

**Then Phase 2 (QA App Scaffold + Environment Infrastructure).** The fixture system and environment validation are the foundation. Until you can verify that the QA environment is in a known state, no test can be safely executed.

**Then Phases 3 and 4 together** (test definitions + execution wizard). These deliver the core value proposition: a non-technical tester can open a test and follow it.

**Then Phases 5–7** add the intelligence layers (campaigns, dependency engine, regression, Kiro generation).

### What to Defer

These items are not needed for the first usable version:

- Cloud screenshot/recording storage (use local filesystem first)
- Automated code-to-test impact analysis (manual regression tagging is sufficient and honest)
- Video recording capture (screenshots are enough for V1)
- `RETEST_REQUIRED` automation via git webhooks (manual trigger is sufficient for now)
- Fresh automated unit/integration/E2E test suite (explicitly deferred; separate effort)
- Multi-tester concurrent coordination beyond basic assignment (serial campaign is fine for V1)

### The First Usable Milestone

After Phases 1–4, the QA Companion delivers its core promise: a non-technical tester can be handed a login URL, told nothing else, and successfully execute a guided cash sale test — including fixture validation, step-by-step instructions with exact product names and prices, and structured failure reporting if something goes wrong.

That is the minimum viable system. Everything else is refinement.

---

*Document generated from repository analysis performed September 8, 2026.*  
*Repository state: `start-pos` monorepo, `apps/web` on active development branch.*  
*This document is a planning artifact. No implementation changes have been made.*
