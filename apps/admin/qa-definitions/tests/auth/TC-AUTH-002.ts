/**
 * TC-AUTH-002 — Log In as Admin
 *
 * Verifies that an admin user can log in and reach the admin dashboard.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_AUTH_002: QaTestCase = {
  id: 'TC-AUTH-002',
  title: 'Log In as Admin',
  risk: 'CRITICAL',
  feature: 'auth',
  workflow: 'login',

  requires: [CONDITIONS.QA_ADMIN_ACCOUNT],
  establishes: [CONDITIONS.ADMIN_LOGGED_IN],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
  },

  steps: [
    {
      instruction: 'Open StartPOS in your browser.',
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Enter the admin email and password.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
    },
    {
      instruction: 'Enter the password.',
      copyable: { label: 'Password', value: '123qwe123!1', secret: true },
    },
    {
      instruction: 'Click the "Sign In" button.',
    },
    {
      instruction: 'Confirm you land on the business dashboard — not the POS screen.',
    },
  ],

  expected: [
    'Login succeeds without an error message.',
    'The dashboard is visible with navigation links.',
    'No "access denied" or permission error appears.',
  ],

  sourceModules: [
    'apps/web/src/routes/(private)/(dashboard)/dashboard/index.tsx',
  ],
}
