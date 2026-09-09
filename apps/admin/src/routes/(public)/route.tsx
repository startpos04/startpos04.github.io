import { AppWrapper } from '@platform/components/custom/app-wrapper'
import { LegalFooter } from '@platform/components/custom/legal-footer'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/(public)')({
  component: () => (
    <AppWrapper>
      <RouteComponent />
    </AppWrapper>
  ),
})

function RouteComponent() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) {
      navigate({ to: '/dashboard', replace: true })
    }
  }, [user, navigate])

  return (
    <div className='h-screen flex flex-col overflow-hidden'>
      <div className='flex-1 overflow-y-auto min-h-0'>
        <Outlet />
      </div>
      <LegalFooter />
    </div>
  )
}
