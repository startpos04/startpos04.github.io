import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const SUBSCRIPTION_ASIDE_ID = 'admin-subscription-aside'

export const showSubscriptionSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: SUBSCRIPTION_ASIDE_ID,
    target: SUBSCRIPTION_ASIDE_ID,
    toggle,
    children,
  })
}

export const closeSubscriptionSidebar = () => {
  MountManager.clear(SUBSCRIPTION_ASIDE_ID)
}
