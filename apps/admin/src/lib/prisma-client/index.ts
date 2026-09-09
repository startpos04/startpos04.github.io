/**
 * prisma-client/index.ts — Admin app Prisma client
 *
 * Admin operates with platform-level (rootPrisma) access — no tenant scoping.
 * All queries are unrestricted by businessId/branchId.
 *
 * Use coreAPI/coreTransactionAPI from @platform for platform model mutations.
 * Use rootPrisma directly for admin-specific queries.
 */
export { prisma } from '@platform/lib/prisma-client'
