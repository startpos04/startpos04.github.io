/**
 * TC-REG-004 — Duplicate Email Registration is Blocked
 *
 * Verifies that attempting to register a new account with an email address
 * that is already in use produces a clear error and does NOT create a
 * duplicate user, business, or subscription.
 *
 * This protects against orphaned tenant records from partial registrations
 * and is a basic data integrity check on the registration flow.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_REG_004: QaTestCase = {
  id: 'TC-REG-004',
  title: 'Duplicate Email Registration Blocked',
  risk: 'HIGH',
  feature: 'registration',
  workflow: 'signup',

  requires: [],
  establishes: [],

  fixture: {
    existingEmail: QA_ACCOUNTS.ADMIN,
    newUserPassword: 'TestPass123!',
    newBusinessName: 'Duplicate Biz Attempt',
    note: 'Use the already-existing QA admin email to attempt a duplicate registration.',
  },

  steps: [
    {
      instruction: 'Open StartPOS in your browser.',
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Click "Sign Up" or "Create Account".',
    },
    {
      instruction: 'Enter the email address that already has an account.',
      copyable: { label: 'Existing Email', value: QA_ACCOUNTS.ADMIN },
    },
    {
      instruction: 'Enter any password.',
      copyable: { label: 'Password', value: 'TestPass123!', secret: true },
    },
    {
      instruction: 'Attempt to proceed through the registration form.',
    },
    {
      instruction: 'Observe whether an error appears about the email already being in use.',
    },
  ],

  expected: [
    'Registration is blocked with a clear error: "Email already in use" or similar.',
    'No new user record is created in the database.',
    'No new business or subscription is created.',
    'The error message appears promptly — ideally inline on the email field.',
    'The existing account is not affected or modified.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/complete-registration.ts',
    'apps/web/src/routes/(public)/register/',
  ],
}
