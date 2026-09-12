/**
 * Role Permission Presets - Phase 0: Authorization System Foundation
 *
 * This file defines default permission sets for each role.
 * These are DEFAULT permissions - individual users can have permissions added or removed.
 *
 * Role hierarchy (implicit, not enforced):
 * OWNER > ADMIN > SUPERVISOR > CASHIER
 */

import { type PermissionKey, Permissions } from './permission-keys'

/**
 * Role definitions as preset collections of permissions.
 * These are DEFAULT permissions - individual users can have permissions added or removed.
 */
export const RolePermissions: Record<string, PermissionKey[]> = {
  // ===================================================================
  // OWNER - Business owner, full access to everything
  // ===================================================================
  OWNER: [
    // All business permissions
    Permissions.BUSINESS_VIEW_BILLING,
    Permissions.BUSINESS_MANAGE_BILLING,
    Permissions.BUSINESS_MANAGE_SUBSCRIPTION,
    Permissions.BUSINESS_VIEW_BRANCHES,
    Permissions.BUSINESS_MANAGE_BRANCHES,
    Permissions.BUSINESS_CREATE_BRANCH,
    Permissions.BUSINESS_DELETE_BRANCH,
    Permissions.BUSINESS_VIEW_CAPABILITIES,
    Permissions.BUSINESS_MANAGE_CAPABILITIES,
    Permissions.BUSINESS_VIEW_PROFILE,
    Permissions.BUSINESS_MANAGE_PROFILE,
    Permissions.BUSINESS_VIEW_SUPPLIERS,
    Permissions.BUSINESS_MANAGE_SUPPLIERS,
    Permissions.BUSINESS_CREATE_SUPPLIER,
    Permissions.BUSINESS_DELETE_SUPPLIER,
    Permissions.BUSINESS_VIEW_CUSTOMERS,
    Permissions.BUSINESS_MANAGE_CUSTOMERS,
    Permissions.BUSINESS_CREATE_CUSTOMER,
    Permissions.BUSINESS_DELETE_CUSTOMER,
    Permissions.BUSINESS_VIEW_USERS,
    Permissions.BUSINESS_MANAGE_USERS,
    Permissions.BUSINESS_INVITE_USER,
    Permissions.BUSINESS_DELETE_USER,
    Permissions.BUSINESS_VIEW_ANALYTICS,
    Permissions.BUSINESS_EXPORT_DATA,

    // All branch permissions
    Permissions.BRANCH_VIEW_EMPLOYEES,
    Permissions.BRANCH_MANAGE_EMPLOYEES,
    Permissions.BRANCH_CREATE_EMPLOYEE,
    Permissions.BRANCH_EDIT_EMPLOYEE,
    Permissions.BRANCH_DELETE_EMPLOYEE,
    Permissions.BRANCH_VIEW_PRODUCTS,
    Permissions.BRANCH_MANAGE_PRODUCTS,
    Permissions.BRANCH_CREATE_PRODUCT,
    Permissions.BRANCH_EDIT_PRODUCT,
    Permissions.BRANCH_DELETE_PRODUCT,
    Permissions.BRANCH_VIEW_INVENTORY,
    Permissions.BRANCH_MANAGE_INVENTORY,
    Permissions.BRANCH_ADJUST_INVENTORY,
    Permissions.BRANCH_VIEW_ORDERS,
    Permissions.BRANCH_CREATE_ORDER,
    Permissions.BRANCH_EDIT_ORDER,
    Permissions.BRANCH_CANCEL_ORDER,
    Permissions.BRANCH_REFUND_ORDER,
    Permissions.BRANCH_VIEW_TRANSACTIONS,
    Permissions.BRANCH_CREATE_TRANSACTION,
    Permissions.BRANCH_VIEW_SALES_REPORTS,
    Permissions.BRANCH_VIEW_INVENTORY_REPORTS,
    Permissions.BRANCH_VIEW_EMPLOYEE_REPORTS,
    Permissions.BRANCH_EXPORT_REPORTS,
    Permissions.BRANCH_VIEW_SETTINGS,
    Permissions.BRANCH_MANAGE_SETTINGS,
    Permissions.BRANCH_MANAGE_ENTITLEMENTS,
    Permissions.BRANCH_VIEW_TASKS,
    Permissions.BRANCH_CREATE_TASK,
    Permissions.BRANCH_MANAGE_TASKS,
    Permissions.BRANCH_VIEW_PURCHASES,
    Permissions.BRANCH_CREATE_PURCHASE,
    Permissions.BRANCH_MANAGE_PURCHASES,
    Permissions.BRANCH_VIEW_PRODUCTION,
    Permissions.BRANCH_CREATE_PRODUCTION,
    Permissions.BRANCH_MANAGE_PRODUCTION,
    Permissions.BRANCH_VIEW_BILLING,
    Permissions.BRANCH_MANAGE_BILLING,

    // User permissions
    Permissions.USER_VIEW_ACCOUNT,
    Permissions.USER_MANAGE_ACCOUNT,
    Permissions.USER_CHANGE_PASSWORD,
    Permissions.USER_MANAGE_PREFERENCES,
    Permissions.USER_MANAGE_PERMISSIONS,
  ],

  // ===================================================================
  // ADMIN - Branch administrator with some business access
  // ===================================================================
  ADMIN: [
    // Limited business permissions (view and manage suppliers/customers, view profile for compliance)
    Permissions.BUSINESS_VIEW_PROFILE,
    Permissions.BUSINESS_VIEW_SUPPLIERS,
    Permissions.BUSINESS_MANAGE_SUPPLIERS,
    Permissions.BUSINESS_VIEW_CUSTOMERS,
    Permissions.BUSINESS_MANAGE_CUSTOMERS,

    // Full branch permissions
    Permissions.BRANCH_VIEW_EMPLOYEES,
    Permissions.BRANCH_MANAGE_EMPLOYEES,
    Permissions.BRANCH_CREATE_EMPLOYEE,
    Permissions.BRANCH_EDIT_EMPLOYEE,
    Permissions.BRANCH_DELETE_EMPLOYEE,
    Permissions.BRANCH_VIEW_PRODUCTS,
    Permissions.BRANCH_MANAGE_PRODUCTS,
    Permissions.BRANCH_CREATE_PRODUCT,
    Permissions.BRANCH_EDIT_PRODUCT,
    Permissions.BRANCH_DELETE_PRODUCT,
    Permissions.BRANCH_VIEW_INVENTORY,
    Permissions.BRANCH_MANAGE_INVENTORY,
    Permissions.BRANCH_ADJUST_INVENTORY,
    Permissions.BRANCH_VIEW_ORDERS,
    Permissions.BRANCH_CREATE_ORDER,
    Permissions.BRANCH_EDIT_ORDER,
    Permissions.BRANCH_CANCEL_ORDER,
    Permissions.BRANCH_REFUND_ORDER,
    Permissions.BRANCH_VIEW_TRANSACTIONS,
    Permissions.BRANCH_CREATE_TRANSACTION,
    Permissions.BRANCH_VIEW_SALES_REPORTS,
    Permissions.BRANCH_VIEW_INVENTORY_REPORTS,
    Permissions.BRANCH_VIEW_EMPLOYEE_REPORTS,
    Permissions.BRANCH_EXPORT_REPORTS,
    Permissions.BRANCH_VIEW_SETTINGS,
    Permissions.BRANCH_MANAGE_SETTINGS,
    Permissions.BRANCH_MANAGE_ENTITLEMENTS,
    Permissions.BRANCH_VIEW_TASKS,
    Permissions.BRANCH_CREATE_TASK,
    Permissions.BRANCH_MANAGE_TASKS,
    Permissions.BRANCH_VIEW_PURCHASES,
    Permissions.BRANCH_CREATE_PURCHASE,
    Permissions.BRANCH_MANAGE_PURCHASES,
    Permissions.BRANCH_VIEW_PRODUCTION,
    Permissions.BRANCH_CREATE_PRODUCTION,
    Permissions.BRANCH_MANAGE_PRODUCTION,
    Permissions.BRANCH_VIEW_BILLING,
    Permissions.BRANCH_MANAGE_BILLING,

    // User permissions
    Permissions.USER_VIEW_ACCOUNT,
    Permissions.USER_MANAGE_ACCOUNT,
    Permissions.USER_CHANGE_PASSWORD,
    Permissions.USER_MANAGE_PREFERENCES,
    Permissions.USER_MANAGE_PERMISSIONS,
  ],

  // ===================================================================
  // SUPERVISOR - Middle management, reports and some admin tasks
  // ===================================================================
  SUPERVISOR: [
    // Limited business permissions
    Permissions.BUSINESS_VIEW_SUPPLIERS,
    Permissions.BUSINESS_MANAGE_SUPPLIERS,
    Permissions.BUSINESS_VIEW_CUSTOMERS,
    Permissions.BUSINESS_MANAGE_CUSTOMERS,

    // Limited branch permissions (no user management by default)
    Permissions.BRANCH_VIEW_EMPLOYEES,
    Permissions.BRANCH_VIEW_PRODUCTS,
    Permissions.BRANCH_MANAGE_PRODUCTS,
    Permissions.BRANCH_CREATE_PRODUCT,
    Permissions.BRANCH_EDIT_PRODUCT,
    Permissions.BRANCH_VIEW_INVENTORY,
    Permissions.BRANCH_MANAGE_INVENTORY,
    Permissions.BRANCH_ADJUST_INVENTORY,
    Permissions.BRANCH_VIEW_ORDERS,
    Permissions.BRANCH_CREATE_ORDER,
    Permissions.BRANCH_EDIT_ORDER,
    Permissions.BRANCH_VIEW_TRANSACTIONS,
    Permissions.BRANCH_CREATE_TRANSACTION,
    Permissions.BRANCH_VIEW_SALES_REPORTS,
    Permissions.BRANCH_VIEW_INVENTORY_REPORTS,
    Permissions.BRANCH_VIEW_EMPLOYEE_REPORTS,
    Permissions.BRANCH_EXPORT_REPORTS,
    Permissions.BRANCH_VIEW_SETTINGS,
    Permissions.BRANCH_VIEW_TASKS,
    Permissions.BRANCH_CREATE_TASK,
    Permissions.BRANCH_MANAGE_TASKS,
    Permissions.BRANCH_VIEW_PURCHASES,
    Permissions.BRANCH_CREATE_PURCHASE,
    Permissions.BRANCH_MANAGE_PURCHASES,
    Permissions.BRANCH_VIEW_PRODUCTION,
    Permissions.BRANCH_CREATE_PRODUCTION,
    Permissions.BRANCH_MANAGE_PRODUCTION,
    Permissions.BRANCH_VIEW_BILLING,

    // User permissions (no permission management)
    Permissions.USER_VIEW_ACCOUNT,
    Permissions.USER_MANAGE_ACCOUNT,
    Permissions.USER_CHANGE_PASSWORD,
    Permissions.USER_MANAGE_PREFERENCES,
  ],

  // ===================================================================
  // CASHIER - Front-line staff, POS and basic operations
  // ===================================================================
  CASHIER: [
    // Very limited branch permissions (POS focused)
    Permissions.BRANCH_VIEW_PRODUCTS,
    Permissions.BRANCH_VIEW_ORDERS,
    Permissions.BRANCH_CREATE_ORDER,
    Permissions.BRANCH_VIEW_TRANSACTIONS,
    Permissions.BRANCH_CREATE_TRANSACTION,
    Permissions.BRANCH_VIEW_TASKS,

    // User permissions (no permission management)
    Permissions.USER_VIEW_ACCOUNT,
    Permissions.USER_MANAGE_ACCOUNT,
    Permissions.USER_CHANGE_PASSWORD,
    Permissions.USER_MANAGE_PREFERENCES,
  ],

  // ===================================================================
  // SERVICE_PROVIDER - Service staff (spa, clinic, etc.)
  // Same as CASHIER but focused on service delivery
  // ===================================================================
  SERVICE_PROVIDER: [
    // Very limited branch permissions (service focused)
    Permissions.BRANCH_VIEW_PRODUCTS,
    Permissions.BRANCH_VIEW_ORDERS,
    Permissions.BRANCH_CREATE_ORDER,
    Permissions.BRANCH_VIEW_TRANSACTIONS,
    Permissions.BRANCH_CREATE_TRANSACTION,
    Permissions.BRANCH_VIEW_TASKS,

    // User permissions (no permission management)
    Permissions.USER_VIEW_ACCOUNT,
    Permissions.USER_MANAGE_ACCOUNT,
    Permissions.USER_CHANGE_PASSWORD,
    Permissions.USER_MANAGE_PREFERENCES,
  ],

  // ===================================================================
  // ADMIN APP ROLES — defaults resolved via adminRoleDefaultPermission
  // table (seeded). These entries are kept here as documentation and as
  // a fallback for getDefaultPermissionsForRole() calls.
  // ===================================================================

  SUPERADMIN: [
    // Dashboard
    Permissions.ADMIN_VIEW_DASHBOARD,
    // Users
    Permissions.ADMIN_VIEW_USERS,
    Permissions.ADMIN_MANAGE_USERS,
    // Businesses
    Permissions.ADMIN_VIEW_BUSINESSES,
    Permissions.ADMIN_MANAGE_BUSINESSES,
    // Subscriptions
    Permissions.ADMIN_VIEW_SUBSCRIPTIONS,
    Permissions.ADMIN_MANAGE_SUBSCRIPTIONS,
    // Payments
    Permissions.ADMIN_VIEW_PAYMENTS,
    Permissions.ADMIN_MANAGE_PAYMENTS,
    // Invoices
    Permissions.ADMIN_VIEW_INVOICES,
    // Notifications
    Permissions.ADMIN_VIEW_NOTIFICATIONS,
    Permissions.ADMIN_MANAGE_NOTIFICATIONS,
    // Audit Logs
    Permissions.ADMIN_VIEW_AUDIT_LOGS,
    // Config
    Permissions.ADMIN_VIEW_CONFIG,
    Permissions.ADMIN_MANAGE_CONFIG,
    // Accounts
    Permissions.ADMIN_VIEW_ACCOUNTS,
    Permissions.ADMIN_MANAGE_ACCOUNTS,
    // Permissions
    Permissions.ADMIN_VIEW_PERMISSIONS,
    Permissions.ADMIN_MANAGE_PERMISSIONS,
    // QA
    Permissions.QA_RUN_TEST,
    Permissions.QA_ASSIGN_TEST,
  ],

  SUPPORT: [
    Permissions.ADMIN_VIEW_DASHBOARD,
    Permissions.ADMIN_VIEW_USERS,
    Permissions.ADMIN_VIEW_BUSINESSES,
    Permissions.ADMIN_VIEW_SUBSCRIPTIONS,
    Permissions.ADMIN_VIEW_NOTIFICATIONS,
    Permissions.ADMIN_VIEW_AUDIT_LOGS,
  ],

  FINANCE: [
    Permissions.ADMIN_VIEW_DASHBOARD,
    Permissions.ADMIN_VIEW_BUSINESSES,
    Permissions.ADMIN_VIEW_SUBSCRIPTIONS,
    Permissions.ADMIN_MANAGE_SUBSCRIPTIONS,
    Permissions.ADMIN_VIEW_PAYMENTS,
    Permissions.ADMIN_MANAGE_PAYMENTS,
    Permissions.ADMIN_VIEW_INVOICES,
  ],

  DEVELOPER: [
    Permissions.ADMIN_VIEW_DASHBOARD,
    Permissions.ADMIN_VIEW_BUSINESSES,
    Permissions.ADMIN_VIEW_SUBSCRIPTIONS,
    Permissions.ADMIN_VIEW_AUDIT_LOGS,
    Permissions.ADMIN_VIEW_CONFIG,
    Permissions.ADMIN_MANAGE_CONFIG,
  ],

  TESTER: [Permissions.ADMIN_VIEW_DASHBOARD, Permissions.QA_RUN_TEST],
}

/**
 * Get default permissions for a role.
 * Returns empty array if role not found.
 */
export function getDefaultPermissionsForRole(role: string): PermissionKey[] {
  return RolePermissions[role] ?? []
}

/**
 * Check if a role includes a specific permission by default.
 */
export function roleHasPermission(role: string, permission: PermissionKey): boolean {
  return RolePermissions[role]?.includes(permission) ?? false
}

/**
 * Get all unique permissions across all roles.
 * Useful for seeding the Permission table.
 */
export function getAllPermissions(): PermissionKey[] {
  const allPermissions = new Set<PermissionKey>()

  for (const permissions of Object.values(RolePermissions)) {
    permissions.forEach(p => {
      allPermissions.add(p)
    })
  }

  return Array.from(allPermissions)
}

/**
 * Get which roles have a specific permission by default.
 */
export function getRolesWithPermission(permission: PermissionKey): string[] {
  return Object.entries(RolePermissions)
    .filter(([_, permissions]) => permissions.includes(permission))
    .map(([role]) => role)
}
