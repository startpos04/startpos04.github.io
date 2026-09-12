import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const USER_ASIDE_ID = 'admin-user-aside'

export const showUserSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: USER_ASIDE_ID,
    target: USER_ASIDE_ID,
    toggle,
    children,
  })
}

export const closeUserSidebar = () => {
  MountManager.clear(USER_ASIDE_ID)
}
