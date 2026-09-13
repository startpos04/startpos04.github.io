import { AppWrapper } from '@platform/components/custom/app-wrapper'
import Loading from '@platform/components/custom/loading'
import { localAuthCollection } from '@platform/db/local-auth'
import { useIsOnline } from '@platform/hooks/use-is-online'
import MountManager from '@platform/lib/mount-manager'
import { useLiveQuery } from '@tanstack/react-db'
import { createFileRoute, Outlet, useNavigate } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { useEffect } from 'react'
import { syncServerToLocal } from '@/lib/better-auth/auth-engine'
import { authStore } from '@/lib/better-auth/auth-store'
import { TermsUpdateModal } from './-components/terms-update-modal'
import { WelcomeModal } from './-components/welcome-modal'

export const Route = createFileRoute('/(private)')({
  component: () => (
    <AppWrapper>
      <RouteComponent />
    </AppWrapper>
  ),
})

function RouteComponent() {
  const isOnline = useIsOnline()

  // user from beforeLoad — populated when online (getAuthUser succeeds).
  // When offline, getAuthUser() throws and beforeLoad returns { user: undefined }.
  const { user: serverUser } = Route.useRouteContext()

  // Offline fallback: read the user that was already stored in authStore
  // from a previous successful online login. This prevents the guard below
  // from redirecting to /login on every page reload while offline.
  const storeUser = useStore(authStore, s => s.user)
  const user = serverUser ?? storeUser ?? null

  const navigate = useNavigate({ from: '/' })
  const localAuths = useLiveQuery(q => q.from({ localAuth: localAuthCollection }).select(({ localAuth }) => localAuth))

  // biome-ignore lint/correctness/useExhaustiveDependencies: it will cause  Maximum update depth exceeded error
  useEffect(() => {
    if (!localAuths.isReady || !localAuths.data) return
    const localUser = isOnline ? user : authStore.state.user

    if (!localUser?.id) {
      navigate({ to: '/login' })
      return
    }

    // Session exists but no Membership yet → OAuth user needs business setup
    if (isOnline && serverUser && !serverUser.business?.id) {
      navigate({ to: '/register/business-setup' })
      return
    }

    const exists = localAuths.data.find(u => u.id === localUser.id)

    if (exists && isOnline && serverUser) {
      syncServerToLocal(serverUser)
    }

    MountManager.clear()
  }, [localAuths.isReady, navigate, user])

  if (!user) return <Loading className='w-screen h-screen' />

  return (
    <div className='flex flex-col min-h-screen'>
      <div className='flex-1 flex flex-col min-h-0'>
        <Outlet />
      </div>
      {/* Terms re-acceptance gate — shown when CURRENT_TERMS_VERSION > user.termsVersion */}
      <TermsUpdateModal />
      {/* Welcome modal — fires once on first login after registration */}
      <WelcomeModal />
    </div>
  )
}
