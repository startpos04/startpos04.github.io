import { PaymentMethod } from 'prisma/generated/prisma/enums'

// APP_NAME and APP_SHORT_NAME live in @startpos/constants — re-exported here
// so existing callers using '@platform/lib/constants' continue to work.
export { APP_NAME, APP_SHORT_NAME } from '@startpos/constants/lib/app'

export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod]
export const PAYMENT_PLATFORMS = {
  GCASH: { id: 'gcash', name: 'GCash', type: PaymentMethod.E_WALLET },
  MAYA: { id: 'maya', name: 'Maya', type: PaymentMethod.E_WALLET },
  BDO: { id: 'bdo_card', name: 'BDO Credit/Debit', type: PaymentMethod.CARD },
} as const satisfies Record<string, { id: string; name: string; type: PaymentMethodType }>

export type PaymentPlatformId = (typeof PAYMENT_PLATFORMS)[keyof typeof PAYMENT_PLATFORMS]['id']
