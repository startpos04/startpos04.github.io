import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const PAYMENT_ASIDE_ID = 'admin-payment-aside'

export const showPaymentSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: PAYMENT_ASIDE_ID,
    target: PAYMENT_ASIDE_ID,
    toggle,
    children,
  })
}

export const closePaymentSidebar = () => {
  MountManager.clear(PAYMENT_ASIDE_ID)
}
