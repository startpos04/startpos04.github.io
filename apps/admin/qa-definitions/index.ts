/**
 * qa-definitions/index.ts
 *
 * Barrel export of all test case definitions.
 * Individual named exports allow importing specific test cases directly.
 * The ALL_TEST_CASES array is the primary consumer for the test list UI.
 */
// fallow-ignore unused-export

// Auth
export { TC_AUTH_001 } from './tests/auth/TC-AUTH-001'
export { TC_AUTH_002 } from './tests/auth/TC-AUTH-002'
export { TC_AUTH_003 } from './tests/auth/TC-AUTH-003'
export { TC_AUTH_004 } from './tests/auth/TC-AUTH-004'
export { TC_AUTH_005 } from './tests/auth/TC-AUTH-005'
export { TC_AUTH_006 } from './tests/auth/TC-AUTH-006'

// Billing
export { TC_BILL_001 } from './tests/billing/TC-BILL-001'
export { TC_BILL_002 } from './tests/billing/TC-BILL-002'
export { TC_BILL_003 } from './tests/billing/TC-BILL-003'
export { TC_BILL_004 } from './tests/billing/TC-BILL-004'
export { TC_BILL_005 } from './tests/billing/TC-BILL-005'
export { TC_BILL_006 } from './tests/billing/TC-BILL-006'
export { TC_BILL_007 } from './tests/billing/TC-BILL-007'
export { TC_BILL_008 } from './tests/billing/TC-BILL-008'
export { TC_BILL_009 } from './tests/billing/TC-BILL-009'

// Inventory
export { TC_INV_001 } from './tests/inventory/TC-INV-001'
export { TC_INV_002 } from './tests/inventory/TC-INV-002'
export { TC_INV_003 } from './tests/inventory/TC-INV-003'
export { TC_INV_004 } from './tests/inventory/TC-INV-004'
export { TC_INV_005 } from './tests/inventory/TC-INV-005'
export { TC_INV_006 } from './tests/inventory/TC-INV-006'

// Offline
export { TC_OFFLINE_001 } from './tests/offline/TC-OFFLINE-001'
export { TC_OFFLINE_002 } from './tests/offline/TC-OFFLINE-002'
export { TC_OFFLINE_003 } from './tests/offline/TC-OFFLINE-003'
export { TC_OFFLINE_004 } from './tests/offline/TC-OFFLINE-004'
export { TC_OFFLINE_005 } from './tests/offline/TC-OFFLINE-005'

// Permissions
export { TC_PERM_001 } from './tests/permissions/TC-PERM-001'
export { TC_PERM_002 } from './tests/permissions/TC-PERM-002'
export { TC_PERM_003 } from './tests/permissions/TC-PERM-003'
export { TC_PERM_004 } from './tests/permissions/TC-PERM-004'
export { TC_PERM_005 } from './tests/permissions/TC-PERM-005'
export { TC_PERM_006 } from './tests/permissions/TC-PERM-006'
export { TC_PERM_007 } from './tests/permissions/TC-PERM-007'
export { TC_PERM_008 } from './tests/permissions/TC-PERM-008'

// POS & Checkout
export { TC_POS_001 } from './tests/pos/TC-POS-001'
export { TC_POS_002 } from './tests/pos/TC-POS-002'
export { TC_POS_003 } from './tests/pos/TC-POS-003'
export { TC_POS_004 } from './tests/pos/TC-POS-004'
export { TC_POS_005 } from './tests/pos/TC-POS-005'
export { TC_POS_006 } from './tests/pos/TC-POS-006'
export { TC_POS_007 } from './tests/pos/TC-POS-007'
export { TC_POS_008 } from './tests/pos/TC-POS-008'
export { TC_POS_009 } from './tests/pos/TC-POS-009'

// POS Session
export { TC_SESS_001 } from './tests/pos/TC-SESS-001'
export { TC_SESS_002 } from './tests/pos/TC-SESS-002'
export { TC_SESS_003 } from './tests/pos/TC-SESS-003'
export { TC_SESS_004 } from './tests/pos/TC-SESS-004'

// Registration
export { TC_REG_001 } from './tests/registration/TC-REG-001'
export { TC_REG_002 } from './tests/registration/TC-REG-002'
export { TC_REG_003 } from './tests/registration/TC-REG-003'
export { TC_REG_004 } from './tests/registration/TC-REG-004'
export { TC_REG_005 } from './tests/registration/TC-REG-005'

import type { QaTestCase } from '@/lib/qa/types'

import { TC_AUTH_001 } from './tests/auth/TC-AUTH-001'
import { TC_AUTH_002 } from './tests/auth/TC-AUTH-002'
import { TC_AUTH_003 } from './tests/auth/TC-AUTH-003'
import { TC_AUTH_004 } from './tests/auth/TC-AUTH-004'
import { TC_AUTH_005 } from './tests/auth/TC-AUTH-005'
import { TC_AUTH_006 } from './tests/auth/TC-AUTH-006'

import { TC_BILL_001 } from './tests/billing/TC-BILL-001'
import { TC_BILL_002 } from './tests/billing/TC-BILL-002'
import { TC_BILL_003 } from './tests/billing/TC-BILL-003'
import { TC_BILL_004 } from './tests/billing/TC-BILL-004'
import { TC_BILL_005 } from './tests/billing/TC-BILL-005'
import { TC_BILL_006 } from './tests/billing/TC-BILL-006'
import { TC_BILL_007 } from './tests/billing/TC-BILL-007'
import { TC_BILL_008 } from './tests/billing/TC-BILL-008'
import { TC_BILL_009 } from './tests/billing/TC-BILL-009'

import { TC_INV_001 } from './tests/inventory/TC-INV-001'
import { TC_INV_002 } from './tests/inventory/TC-INV-002'
import { TC_INV_003 } from './tests/inventory/TC-INV-003'
import { TC_INV_004 } from './tests/inventory/TC-INV-004'
import { TC_INV_005 } from './tests/inventory/TC-INV-005'
import { TC_INV_006 } from './tests/inventory/TC-INV-006'

import { TC_OFFLINE_001 } from './tests/offline/TC-OFFLINE-001'
import { TC_OFFLINE_002 } from './tests/offline/TC-OFFLINE-002'
import { TC_OFFLINE_003 } from './tests/offline/TC-OFFLINE-003'
import { TC_OFFLINE_004 } from './tests/offline/TC-OFFLINE-004'
import { TC_OFFLINE_005 } from './tests/offline/TC-OFFLINE-005'

import { TC_PERM_001 } from './tests/permissions/TC-PERM-001'
import { TC_PERM_002 } from './tests/permissions/TC-PERM-002'
import { TC_PERM_003 } from './tests/permissions/TC-PERM-003'
import { TC_PERM_004 } from './tests/permissions/TC-PERM-004'
import { TC_PERM_005 } from './tests/permissions/TC-PERM-005'
import { TC_PERM_006 } from './tests/permissions/TC-PERM-006'
import { TC_PERM_007 } from './tests/permissions/TC-PERM-007'
import { TC_PERM_008 } from './tests/permissions/TC-PERM-008'

import { TC_POS_001 } from './tests/pos/TC-POS-001'
import { TC_POS_002 } from './tests/pos/TC-POS-002'
import { TC_POS_003 } from './tests/pos/TC-POS-003'
import { TC_POS_004 } from './tests/pos/TC-POS-004'
import { TC_POS_005 } from './tests/pos/TC-POS-005'
import { TC_POS_006 } from './tests/pos/TC-POS-006'
import { TC_POS_007 } from './tests/pos/TC-POS-007'
import { TC_POS_008 } from './tests/pos/TC-POS-008'
import { TC_POS_009 } from './tests/pos/TC-POS-009'
import { TC_SESS_001 } from './tests/pos/TC-SESS-001'
import { TC_SESS_002 } from './tests/pos/TC-SESS-002'
import { TC_SESS_003 } from './tests/pos/TC-SESS-003'
import { TC_SESS_004 } from './tests/pos/TC-SESS-004'

import { TC_REG_001 } from './tests/registration/TC-REG-001'
import { TC_REG_002 } from './tests/registration/TC-REG-002'
import { TC_REG_003 } from './tests/registration/TC-REG-003'
import { TC_REG_004 } from './tests/registration/TC-REG-004'
import { TC_REG_005 } from './tests/registration/TC-REG-005'

/**
 * Ordered list of all V1 test cases.
 * Auth → Registration → Session → POS → Inventory → Billing → Offline → Permissions
 */
export const ALL_TEST_CASES: QaTestCase[] = [
  // Auth — must pass first, other tests depend on login working
  TC_AUTH_001,
  TC_AUTH_002,
  TC_AUTH_003,
  TC_AUTH_004,
  TC_AUTH_005, // supervisor login
  TC_AUTH_006, // session persists after refresh

  // Registration — new business onboarding
  TC_REG_001,
  TC_REG_002,
  TC_REG_003,
  TC_REG_004, // duplicate email blocked
  TC_REG_005, // onboarding: first branch + product → POS operational

  // Session — shift management
  TC_SESS_001,
  TC_SESS_002,
  TC_SESS_003, // checkout blocked without open shift
  TC_SESS_004, // two cashiers, independent shifts

  // POS — core checkout flows
  TC_POS_001,
  TC_POS_002,
  TC_POS_003,
  TC_POS_004,
  TC_POS_005,
  TC_POS_006,
  TC_POS_007, // split payment (cash + e-wallet)
  TC_POS_008, // quantity > 1 on a single line item
  TC_POS_009, // cancel cart before checkout → no transaction

  // Inventory — stock management
  TC_INV_001,
  TC_INV_002,
  TC_INV_003,
  TC_INV_004,
  TC_INV_005, // void purchase order
  TC_INV_006, // partial GRN (receive less than ordered)

  // Billing — credits and subscription limits
  TC_BILL_001,
  TC_BILL_002,
  TC_BILL_003,
  TC_BILL_004,
  TC_BILL_005,
  TC_BILL_006, // grace period: warning shown, POS still works
  TC_BILL_007, // low credit balance warning, checkout not blocked
  TC_BILL_008, // suspended account: all operational features blocked
  TC_BILL_009, // trial days remaining + TX usage visible

  // Offline — disconnected operation
  TC_OFFLINE_001,
  TC_OFFLINE_002,
  TC_OFFLINE_003,
  TC_OFFLINE_004, // data persists after page refresh while offline
  TC_OFFLINE_005, // permissions enforced while offline

  // Permissions — role enforcement (blocks)
  TC_PERM_001,
  TC_PERM_002,
  TC_PERM_003,
  TC_PERM_004,
  TC_PERM_005, // cashier blocked from inventory management
  TC_PERM_006, // cashier blocked from purchase orders
  // Permissions — role access (grants)
  TC_PERM_007, // supervisor can approve purchase order
  TC_PERM_008, // admin can perform stock adjustment
]
