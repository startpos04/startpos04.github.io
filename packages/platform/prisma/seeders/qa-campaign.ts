/**
 * qa-campaign.ts
 *
 * Seeds the V1 Certification campaign into QaCampaign.
 * Runs after admin-accounts (order = -0.5) so the superadmin ID exists.
 *
 * Safe to re-run — uses upsert on the fixed campaign ID.
 */

import type { PrismaClient } from 'prisma/generated/prisma/client'

// fallow-ignore-next-line unused-export
export const order = -0.5

const V1_CAMPAIGN_ID = 'qa-campaign-v1-certification'

export default async function seedQaCampaign(prisma: PrismaClient) {
  console.info('\n📋 Seeding QA campaigns...')

  const superadmin = await prisma.adminUser.findFirst({
    where: { role: 'SUPERADMIN' },
    select: { id: true },
  })

  if (!superadmin) {
    console.warn('   ⚠️  No SUPERADMIN found — skipping QA campaign seed. Run admin-accounts seeder first.')
    return
  }

  await prisma.qaCampaign.upsert({
    where: { id: V1_CAMPAIGN_ID },
    update: {
      name: 'StartPOS V1 Certification',
      description: 'Complete test coverage required before V1 production launch. All CRITICAL and HIGH tests must pass.',
      status: 'ACTIVE',
      targetBuild: 'v1.0.0',
    },
    create: {
      id: V1_CAMPAIGN_ID,
      name: 'StartPOS V1 Certification',
      description: 'Complete test coverage required before V1 production launch. All CRITICAL and HIGH tests must pass.',
      status: 'ACTIVE',
      targetBuild: 'v1.0.0',
      createdById: superadmin.id,
    },
  })

  console.info('   ✅ V1 Certification campaign ready')
}
