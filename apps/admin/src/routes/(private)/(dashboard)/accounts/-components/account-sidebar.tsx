import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const ACCOUNT_ASIDE_ID = 'admin-account-aside'

export const showAccountSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: ACCOUNT_ASIDE_ID,
    target: ACCOUNT_ASIDE_ID,
    toggle,
    children,
  })
}

export const closeAccountSidebar = () => {
  MountManager.clear(ACCOUNT_ASIDE_ID)
}
