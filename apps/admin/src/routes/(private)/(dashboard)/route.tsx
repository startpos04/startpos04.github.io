import { createFileRoute, Outlet } from '@tanstack/react-router'
import { Dashboard } from '@/components/custom/dashboard'

export const Route = createFileRoute('/(private)/(dashboard)')({
  component: DashboardLayout,
})

function DashboardLayout() {
  return (
    <Dashboard>
      <Outlet />
    </Dashboard>
  )
}
