/**
 * qa/constants.ts
 *
 * Shared constants for the QA Companion.
 * Mirrors values from the e2e seed data so the fixture validator and UI
 * can reference them without hard-coding strings in multiple places.
 */

// ---------------------------------------------------------------------------
// E2E tenant accounts (seeded via csv/e2e/accounts.csv)
// ---------------------------------------------------------------------------

export const QA_ACCOUNTS = {
  ADMIN: 'e2e.admin@test.com',
  SUPERVISOR: 'e2e.supervisor@test.com',
  CASHIER: 'e2e.cashier@test.com',
  CASHIER2: 'e2e.cashier2@test.com',
  SUPERVISOR2: 'e2e.supervisor2@test.com',
  CASHIER3: 'e2e.cashier3@test.com',
  ADMIN2: 'e2e.admin2@test.com',
  CASHIER4: 'e2e.cashier4@test.com',
} as const

// Shared password for all E2E accounts
export const QA_ACCOUNT_PASSWORD = '123qwe123!1'

// ---------------------------------------------------------------------------
// E2E businesses & branches
// ---------------------------------------------------------------------------

export const QA_BUSINESS = {
  MAIN: 'E2E Test Restaurant',
  ISOLATION: 'E2E Isolation Business',
} as const

export const QA_BRANCH = {
  MAIN: 'E2E Main Branch',
  SECOND: 'E2E Second Branch',
  ISOLATION: 'Isolation Branch',
} as const

// ---------------------------------------------------------------------------
// E2E products (seeded via csv/e2e/product-variants.csv)
// ---------------------------------------------------------------------------

export const QA_PRODUCTS = {
  COFFEE_SM: { name: 'E2E Brewed Coffee', variant: 'Small (8oz)', sku: 'E2E-COF-SM', price: '₱80.00' },
  COFFEE_LG: { name: 'E2E Brewed Coffee', variant: 'Large (16oz)', sku: 'E2E-COF-LG', price: '₱120.00' },
  MILK_TEA_STD: { name: 'E2E Milk Tea', variant: 'Standard (16oz)', sku: 'E2E-MT-STD', price: '₱130.00' },
  MILK_TEA_LG: { name: 'E2E Milk Tea', variant: 'Large (22oz)', sku: 'E2E-MT-LG', price: '₱160.00' },
  LEMONADE: { name: 'E2E Fresh Lemonade', variant: 'Regular (12oz)', sku: 'E2E-LEM-REG', price: '₱70.00' },
  SODA: { name: 'E2E House Soda', variant: 'Original Flavor', sku: 'E2E-SODA-ORIG', price: '₱50.00' },
  SISIG: { name: 'E2E Sisig Bowl', variant: 'Standard', sku: 'E2E-BOWL-SISIG', price: '₱185.00' },
  CHICKEN: { name: 'E2E Fried Chicken Meal', variant: '1pc Chicken with Rice', sku: 'E2E-MEAL-CHKN', price: '₱145.00' },
  RIBS: { name: 'E2E Pork Ribs Platter', variant: 'Half Rack', sku: 'E2E-RIBS-HALF', price: '₱320.00' },
  PASTA: { name: 'E2E Aglio Olio Pasta', variant: 'Regular (200g)', sku: 'E2E-PASTA-REG', price: '₱160.00' },
} as const

// ---------------------------------------------------------------------------
// Business rule constants (mirrored from packages/constants)
// ---------------------------------------------------------------------------

export const QA_LIMITS = {
  TRIAL_TX_LIMIT: 500,
  TRIAL_DURATION_DAYS: 30,
  STARTING_CREDITS: 50,
  CREDIT_COST_PER_TX: 1,
  GRACE_PERIOD_DAYS: 7,
  LOW_BALANCE_THRESHOLD: 10,
} as const

// ---------------------------------------------------------------------------
// Condition IDs referenced by test definitions
// ---------------------------------------------------------------------------

export const CONDITIONS = {
  // Environment — basic data existence checks
  QA_CASHIER_ACCOUNT: 'env.qa_cashier_account',
  QA_ADMIN_ACCOUNT: 'env.qa_admin_account',
  QA_SUPERVISOR_ACCOUNT: 'env.qa_supervisor_account',
  QA_BRANCH_EXISTS: 'env.qa_branch_exists',
  QA_PRODUCT_HAS_STOCK: 'env.qa_product_has_stock',
  QA_SUBSCRIPTION_ACTIVE: 'env.subscription_active',

  // POS session
  VENDOR_SESSION_OPEN: 'pos.vendor_session_open',

  // POS outcomes
  COMPLETED_SALE: 'pos.completed_sale',
  INVENTORY_DECREASED: 'pos.inventory_decreased',
  RECEIPT_GENERATED: 'pos.receipt_generated',

  // Auth outcomes
  CASHIER_LOGGED_IN: 'auth.cashier_logged_in',
  ADMIN_LOGGED_IN: 'auth.admin_logged_in',
} as const

// ---------------------------------------------------------------------------
// Feature area labels
// ---------------------------------------------------------------------------

export const FEATURE_LABELS: Record<string, string> = {
  auth: 'Authentication',
  pos: 'POS & Checkout',
  inventory: 'Inventory',
  billing: 'Billing & Credits',
  offline: 'Offline Mode',
  permissions: 'Permissions',
  registration: 'Registration',
}

// ---------------------------------------------------------------------------
// Risk badge colors (Tailwind classes)
// ---------------------------------------------------------------------------

export const RISK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  HIGH: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800' },
  MEDIUM: { bg: 'bg-yellow-50 dark:bg-yellow-950/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-800' },
  LOW: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
}

export const OUTCOME_COLORS: Record<string, { bg: string; text: string }> = {
  PASSED: { bg: 'bg-green-50 dark:bg-green-950/30', text: 'text-green-700 dark:text-green-400' },
  FAILED: { bg: 'bg-red-50 dark:bg-red-950/30', text: 'text-red-700 dark:text-red-400' },
  BLOCKED: { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400' },
  SKIPPED: { bg: 'bg-gray-50', text: 'text-gray-500' },
}
