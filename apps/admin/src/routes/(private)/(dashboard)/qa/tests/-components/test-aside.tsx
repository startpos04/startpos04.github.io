import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const TEST_ASIDE_ID = 'qa-test-aside'

export const showTestAside = (children: ReactNode) => {
  MountManager.show(Aside, {
    key: TEST_ASIDE_ID,
    target: TEST_ASIDE_ID,
    children,
    className: 'rounded-none',
  })
}

export const closeTestAside = () => {
  MountManager.clear(TEST_ASIDE_ID)
}
