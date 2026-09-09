import Loading from '@platform/components/custom/loading'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/(public)/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { user } = Route.useRouteContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.id) {
      navigate({ to: '/dashboard', replace: true })
    } else {
      navigate({ to: '/login', replace: true })
    }
  }, [user, navigate])

  return <Loading className='w-screen h-screen' />
}
