/**
 * admin-accounts.ts
 *
 * Seeds the default admin panel accounts into the AdminUser table.
 * These accounts are completely separate from tenant User records —
 * they can only authenticate via the admin app (apps/admin).
 *
 * Default credentials (change after first login in production):
 *   superadmin@startpos.app / admin1234
 */

import { hashPassword } from 'better-auth/crypto'
import type { PrismaClient } from 'prisma/generated/prisma/client'

// Runs before tenant account seeders
// fallow-ignore-next-line unused-export
export const order = -1

const DEFAULT_ADMIN_PASSWORD = '123qwe123!1'

const ADMIN_ACCOUNTS = [
  {
    id: 'admin-superadmin-1',
    email: 'superadmin@startpos.com',
    name: 'Super Admin',
    role: 'SUPERADMIN',
  },
  {
    id: 'admin-support-1',
    email: 'support@startpos.com',
    name: 'Support Admin',
    role: 'SUPPORT',
  },
]

export default async function seedAdminAccounts(prisma: PrismaClient) {
  console.info('\n👤 Seeding admin accounts...')

  const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD)

  for (const account of ADMIN_ACCOUNTS) {
    const existing = await prisma.adminUser.findUnique({
      where: { email: account.email },
    })

    if (existing) {
      console.info(`   ✓ Already exists: ${account.email}`)
      continue
    }

    await prisma.adminUser.create({
      data: {
        id: account.id,
        email: account.email,
        name: account.name,
        role: account.role,
        emailVerified: true,
        accounts: {
          create: {
            id: `${account.id}-credential`,
            accountId: account.email,
            providerId: 'credential',
            password: hashedPassword,
          },
        },
      },
    })

    console.info(`   ✅ Created: ${account.email} (${account.role})`)
  }

  console.info(`\n   🔑 Default password: "${DEFAULT_ADMIN_PASSWORD}" — change after first login`)
}
