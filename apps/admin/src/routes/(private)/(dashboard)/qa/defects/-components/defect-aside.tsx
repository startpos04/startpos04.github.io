import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const DEFECT_ASIDE_ID = 'qa-defect-aside'

export const showDefectAside = (children: ReactNode) => {
  MountManager.show(Aside, {
    key: DEFECT_ASIDE_ID,
    target: DEFECT_ASIDE_ID,
    children,
    className: 'rounded-none',
  })
}

export const closeDefectAside = () => {
  MountManager.clear(DEFECT_ASIDE_ID)
}
