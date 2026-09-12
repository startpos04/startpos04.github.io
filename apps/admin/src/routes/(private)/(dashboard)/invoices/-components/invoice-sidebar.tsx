import { Aside } from '@platform/components/custom/aside'
import MountManager from '@platform/lib/mount-manager'
import type { ReactNode } from 'react'

export const INVOICE_ASIDE_ID = 'admin-invoice-aside'

export const showInvoiceSidebar = (children: ReactNode, toggle = false) => {
  MountManager.show(Aside, {
    key: INVOICE_ASIDE_ID,
    target: INVOICE_ASIDE_ID,
    toggle,
    children,
  })
}

export const closeInvoiceSidebar = () => {
  MountManager.clear(INVOICE_ASIDE_ID)
}
