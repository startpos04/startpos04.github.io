import { prisma } from '@platform/lib/prisma-client'
import seedQaCampaign from 'prisma/seeders/qa-campaign'

async function main() {
  await seedQaCampaign(prisma)
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
