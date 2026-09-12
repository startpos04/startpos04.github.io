import { prisma } from '@platform/lib/prisma-client'

async function main() {
  try {
    const count = await prisma.qaTestRun.count()
    console.log(`✅ QA tables exist. QaTestRun rows: ${count}`)
  } catch (e) {
    console.error('❌ QA tables missing — run pnpm db:push or pnpm db:generate + migrate')
    console.error(e instanceof Error ? e.message : e)
  }
  await prisma.$disconnect()
}

main().catch(console.error)
