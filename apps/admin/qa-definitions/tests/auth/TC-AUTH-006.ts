/**
 * TC-AUTH-006 — Session Persists After Browser Refresh
 *
 * Verifies that an authenticated user's session is preserved across a
 * full browser page reload and they are not logged out unexpectedly.
 * Also verifies that a logged-out user cannot access protected pages
 * by visiting a URL directly.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_AUTH_006: QaTestCase = {
  id: 'TC-AUTH-006',
  title: 'Session Persists After Page Refresh',
  risk: 'HIGH',
  feature: 'auth',
  workflow: 'session',

  requires: [CONDITIONS.QA_CASHIER_ACCOUNT, CONDITIONS.CASHIER_LOGGED_IN],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.CASHIER,
  },

  steps: [
    {
      instruction: 'Log in as the cashier (complete TC-AUTH-001 first).',
      copyable: { label: 'Email', value: QA_ACCOUNTS.CASHIER },
    },
    {
      instruction: 'Once on the POS screen, press F5 or Ctrl+R to hard-refresh the page.',
    },
    {
      instruction: 'Observe whether you remain on the POS screen or are redirected to the login page.',
    },
    {
      instruction: 'If you are still on the POS screen, the session persisted correctly.',
    },
    {
      instruction: 'Now log out using the logout button in the user menu.',
    },
    {
      instruction: 'After logout, try to navigate directly to the POS URL.',
      openUrl: 'http://localhost:3000/pos',
    },
    {
      instruction: 'Observe whether you are redirected to the login page.',
    },
  ],

  expected: [
    'After browser refresh, the user remains logged in and on the POS screen.',
    'Product data reloads correctly after refresh (no blank or broken state).',
    'After logout, visiting /pos redirects to the login page.',
    'No authentication token is exposed in the URL.',
  ],

  sourceModules: [
    'apps/web/src/routes/(public)/login.tsx',
    'apps/web/src/routes/(private)/(dashboard)/pos/index.tsx',
  ],
}
