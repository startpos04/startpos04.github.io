/**
 * TC-PERM-004 — Admin Can Create an Employee
 *
 * Verifies that an admin role can navigate to the employees section,
 * create a new employee account, and assign a role.
 */

import type { QaTestCase } from '@/lib/qa/types'
import { CONDITIONS, QA_ACCOUNTS } from '@/lib/qa/constants'

export const TC_PERM_004: QaTestCase = {
  id: 'TC-PERM-004',
  title: 'Admin Can Create an Employee',
  risk: 'MEDIUM',
  feature: 'permissions',
  workflow: 'role-access',

  requires: [
    CONDITIONS.QA_ADMIN_ACCOUNT,
    CONDITIONS.QA_BRANCH_EXISTS,
    CONDITIONS.QA_SUBSCRIPTION_ACTIVE,
  ],
  establishes: [],

  fixture: {
    account: QA_ACCOUNTS.ADMIN,
    branch: 'E2E Main Branch',
    newEmployeeName: 'QA Test Employee',
    newEmployeeEmail: 'qa.temp.employee@test.com',
    newEmployeeRole: 'CASHIER',
  },

  steps: [
    {
      instruction: 'Log in as the admin.',
      copyable: { label: 'Email', value: QA_ACCOUNTS.ADMIN },
      openUrl: 'http://localhost:3000',
    },
    {
      instruction: 'Navigate to Employees in the sidebar.',
    },
    {
      instruction: 'Tap "Add Employee" or "Invite Employee".',
    },
    {
      instruction: 'Enter the employee name.',
      copyable: { label: 'Name', value: 'QA Test Employee' },
    },
    {
      instruction: 'Enter the employee email.',
      copyable: { label: 'Email', value: 'qa.temp.employee@test.com' },
    },
    {
      instruction: 'Select "CASHIER" as the role.',
    },
    {
      instruction: 'Submit the form.',
    },
    {
      instruction: 'Verify the new employee appears in the employees list.',
    },
  ],

  expected: [
    'Employee is created successfully.',
    'The new employee appears in the employees list with the CASHIER role.',
    'No "Access Denied" error is shown.',
  ],

  sourceModules: [
    'apps/web/src/lib/authorization/permission-keys.ts',
    'apps/web/src/routes/(private)/(dashboard)/employees/',
  ],
}
