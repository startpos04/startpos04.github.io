/**
 * Dashboard — Admin panel layout wrapper.
 *
 * Mirrors the web app's Dashboard component:
 *   SidebarProvider → AdminSidebar + SidebarInset → AppNav + children
 *
 * Usage in route.tsx:
 *   <Dashboard><Outlet /></Dashboard>
 */

import { LegalFooter } from '@platform/components/custom/legal-footer'
import { SidebarInset, SidebarProvider } from '@platform/components/ui/sidebar'
import { TooltipProvider } from '@platform/components/ui/tooltip'
import type { ReactNode } from 'react'
import { AdminSidebar } from '@/components/custom/dashboard/app-sidebar'
import { AppNav } from './app-nav'

export function Dashboard({ children }: { children?: ReactNode }) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset className='flex flex-col h-screen overflow-hidden justify-start'>
          <AppNav />
          <div className='pt-0 grow h-1 overflow-y-auto flex flex-col gap-2'>{children}</div>
          <LegalFooter />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
