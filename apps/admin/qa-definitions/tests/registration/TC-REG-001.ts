/**
 * TC-REG-001 — New Business Registration Completes
 *
 * Verifies the full registration flow: a new user signs up, provides
 * business details, and successfully lands on the onboarding screen.
 */

import type { QaTestCase } from '@/lib/qa/types'

export const TC_REG_001: QaTestCase = {
  id: 'TC-REG-001',
  title: 'New Business Registration Completes',
  risk: 'CRITICAL',
  feature: 'registration',
  workflow: 'signup',

  requires: [],
  establishes: [],

  fixture: {
    newUserEmail: 'qa.newbiz.001@test.com',
    newUserPassword: 'TestPass123!',
    businessName: 'QA Test Biz 001',
    businessType: 'RESTAURANT',
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
      instruction: 'Enter the test email address.',
      copyable: { label: 'Email', value: 'qa.newbiz.001@test.com' },
    },
    {
      instruction: 'Enter the password.',
      copyable: { label: 'Password', value: 'TestPass123!', secret: true },
    },
    {
      instruction: 'Complete email verification if prompted (check the test email inbox or look for the OTP on screen).',
      hint: 'In a local dev environment, the OTP may be printed to the server console.',
    },
    {
      instruction: 'Enter business name.',
      copyable: { label: 'Business name', value: 'QA Test Biz 001' },
    },
    {
      instruction: 'Select "Restaurant" as the business type.',
    },
    {
      instruction: 'Complete the setup wizard and confirm you reach the main dashboard or onboarding screen.',
    },
  ],

  expected: [
    'Registration completes without errors.',
    'User is logged in and lands on dashboard or onboarding.',
    'A new business and branch record exist in the database.',
    'A TRIAL subscription is automatically provisioned.',
    '50 complimentary credits appear in the credit balance.',
  ],

  sourceModules: [
    'apps/web/src/lib/queries/complete-registration.ts',
    'apps/web/src/routes/(public)/register/',
    'packages/platform/prisma/seeders/plans.ts',
  ],
}
