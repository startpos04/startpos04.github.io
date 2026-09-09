import Loading from '@platform/components/custom/loading'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/(private)')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user?.id) {
      navigate({ to: '/login' })
    }
  }, [user, navigate])

  if (!user) return <Loading className='w-screen h-screen' />

  return <Outlet />
}
