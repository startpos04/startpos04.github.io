/**
 * TC-OFFLINE-005 — Permissions Enforced While Offline
 *
 * Verifies that role-based access controls work correctly when the device
 * is disconnected from the network. A cashier must not be able to access
 * admin-only pages simply because the app is offline and cannot reach the
 * server to perform a permission check.
 *
 * This tests that permissions are cached locally alongside collection data
 * and enforced client-side without requiring a server round-trip.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_OFFLINE_005: QaTestCase = {
  id: 'TC-OFFLINE-005',
  title: 'Offline — Permissions Still Enforced',
  risk: 'CRITICAL',
  feature: 'offline',
  workflow: 'offline-permissions',

  requires: [
    CONDITIONS.QA_CASHIER_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
    CONDITIONS.CASHIER_LOGGED_IN,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
    branch: 'E2E Main Branch',
    restrictedPaths: ['/inventory', '/employees', '/products'],
    note: 'Log in as the cashier while online first so permissions sync locally, then go offline and test access to restricted pages.',
  },

  steps: [
    {
      instruction: 'Log in as the cashier while online and wait for the app to fully load and sync.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Confirm the POS screen loads and products are visible (data is synced).',
    },
    {
      instruction: 'Go offline: disable your network connection.',
      manualAction: true,
    },
    {
      instruction: 'Confirm the app shows an offline indicator but the POS remains usable.',
    },
    {
      instruction: 'While offline, attempt to navigate to the Inventory page.',
      openUrl: 'http://localhost:3000/inventory',
    },
    {
      instruction: 'Observe whether access is denied or you are redirected — same as when online.',
    },
    {
      instruction: 'Attempt to navigate to the Employees page while still offline.',
      openUrl: 'http://localhost:3000/employees',
    },
    {
      instruction: 'Observe whether access is denied.',
    },
    {
      instruction: 'Return to the POS screen and confirm it still works offline.',
    },
  ],

  expected: [
    'While offline, the cashier is denied access to /inventory — same behaviour as online.',
    'While offline, the cashier is denied access to /employees — same behaviour as online.',
    'Permission denial messages appear without requiring a server response.',
    'The POS screen remains fully usable while offline (permissions do not accidentally block the cashier\'s own pages).',
    'No unhandled errors or blank screens appear when navigating to restricted pages offline.',
  ],

  sourceModules: [
    'apps/web/src/db/collections.ts',
    'packages/platform/lib/authorization/permission-keys.ts',
    'packages/platform/lib/entitlement/entitlement-engine.ts',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
