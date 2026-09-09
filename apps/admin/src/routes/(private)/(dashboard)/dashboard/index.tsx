import { APP_NAME } from '@platform/lib/constants'
import { createFileRoute } from '@tanstack/react-router'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'
import { logout } from '@/lib/better-auth/auth-engine'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/(private)/(dashboard)/dashboard')({
  component: DashboardPage,
})

function DashboardPage() {
  const user = useAuthenticatedUser()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout({ onSuccess: () => navigate({ to: '/login' }) })
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen gap-6 p-8'>
      <div className='text-center space-y-2'>
        <h1 className='text-3xl font-bold text-foreground'>{APP_NAME} Admin</h1>
        <p className='text-muted-foreground'>Welcome, {user.name ?? user.email}</p>
        <p className='text-xs text-muted-foreground'>Role: {user.role ?? '—'}</p>
      </div>
      <button
        type='button'
        onClick={handleLogout}
        className='px-4 py-2 text-sm font-medium rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity'
      >
        Sign out
      </button>
    </div>
  )
}
