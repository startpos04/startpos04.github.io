import { prisma } from '@platform/lib/prisma-client'

async function main() {
  const users = await prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, role: true, emailVerified: true },
  })

  if (users.length === 0) {
    console.log('❌ No admin users found — run pnpm db:seed first')
  } else {
    console.log(`✅ Found ${users.length} admin user(s):`)
    for (const u of users) {
      console.log(`   ${u.email} | ${u.role} | verified: ${u.emailVerified}`)
    }
  }

  const accounts = await prisma.adminAccount.findMany({
    select: { id: true, accountId: true, providerId: true, userId: true },
  })
  console.log(`\n🔑 Admin accounts (credentials):`, accounts.length)
  for (const a of accounts) {
    console.log(`   ${a.accountId} | provider: ${a.providerId}`)
  }

  await prisma.$disconnect()
}

main().catch(console.error)
