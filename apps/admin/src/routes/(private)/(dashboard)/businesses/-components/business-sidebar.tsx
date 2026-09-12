import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const BUSINESS_ASIDE_ID = 'admin-business-aside'

export const showBusinessSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: BUSINESS_ASIDE_ID,
    target: BUSINESS_ASIDE_ID,
    toggle,
    children,
  })
}

export const closeBusinessSidebar = () => {
  MountManager.clear(BUSINESS_ASIDE_ID)
}
