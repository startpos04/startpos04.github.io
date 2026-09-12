/**
 * ProfileDropdown — Admin panel user menu.
 *
 * Shows the logged-in admin's name, email and role.
 * Provides a logout action. Mirrors web app's ProfileDropdown.
 */

import { Badge } from '@platform/components/ui/badge'
import { Button } from '@platform/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@platform/components/ui/dropdown-menu'
import { useNavigate } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'
import { LogOut, UserCircle } from 'lucide-react'
import { logout } from '@/lib/better-auth/auth-engine'
import { authStore } from '@/lib/better-auth/auth-store'

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: 'bg-purple-600',
  TESTER: 'bg-blue-600',
  SUPPORT: 'bg-green-600',
  FINANCE: 'bg-amber-600',
  DEVELOPER: 'bg-slate-600',
}

export function ProfileDropdown() {
  const user = useStore(authStore, state => state.user)
  const navigate = useNavigate()

  if (!user) return null

  const role = (user as { role?: string })?.role ?? '—'

  const handleLogout = () => {
    logout({ onSuccess: () => navigate({ to: '/login' }) })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <UserCircle className='size-5' />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align='end' className='w-60'>
        <div className='px-3 py-2.5'>
          <div className='flex items-start justify-between gap-2'>
            <div className='flex flex-col min-w-0'>
              <span className='text-sm font-bold truncate leading-tight'>
                {(user as { name?: string })?.name || 'Admin User'}
              </span>
              <span className='text-xs text-muted-foreground truncate mt-0.5'>
                {(user as { email?: string })?.email}
              </span>
            </div>
            <Badge
              className={`${ROLE_COLORS[role] ?? 'bg-muted'} text-white text-[10px] shrink-0 mt-0.5`}
            >
              {role}
            </Badge>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className='flex items-center gap-3 cursor-pointer py-2.5 px-3 text-destructive focus:bg-destructive/10'
          onClick={handleLogout}
        >
          <LogOut className='size-4' />
          <span className='font-semibold'>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
