/**
 * app-sidebar.tsx — Admin panel navigation sidebar
 *
 * Every section is a collapsible accordion — same pattern as QA Companion.
 * Groups: Overview · Tenants · Billing · Platform · QA Companion
 *
 * Items are hidden when the user lacks the required permission.
 * A group is hidden entirely when all its items are filtered out.
 */

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@platform/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@platform/components/ui/sidebar'
import { Permissions } from '@platform/lib/authorization/permission-keys'
import { APP_NAME } from '@platform/lib/constants'
import { Link, useLocation } from '@tanstack/react-router'
import {
  BellIcon,
  BriefcaseIcon,
  BugIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  CreditCardIcon,
  FileTextIcon,
  FlaskConicalIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListIcon,
  ReceiptIcon,
  ServerIcon,
  ShieldIcon,
  SlidersIcon,
  TrophyIcon,
  UserIcon,
  UsersIcon,
} from 'lucide-react'
import type * as React from 'react'
import { useAuthenticatedUser } from '@/lib/better-auth/auth-store'

// ---------------------------------------------------------------------------
// Brand logo
// ---------------------------------------------------------------------------

function BrandIcon() {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32' width='16' height='16'>
      <rect width='32' height='32' rx='8' fill='#10b981' />
      <path d='M8 6L5 10v14a2 2 0 002 2h18a2 2 0 002-2V10L24 6z' fill='none' stroke='white' strokeWidth='2' strokeLinejoin='round' />
      <line x1='5' y1='10' x2='27' y2='10' stroke='white' strokeWidth='2' />
      <path d='M20 14a4 4 0 01-8 0' fill='none' stroke='white' strokeWidth='2' strokeLinecap='round' />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavSubItem {
  label: string
  href: string
  icon: React.ReactNode
  /** If set, the item is hidden when the user lacks this permission */
  permission?: string
}

interface NavGroup {
  label: string
  href: string // used as key + active check for the accordion itself
  icon: React.ReactNode // shown on the collapsed accordion button
  items: NavSubItem[]
}

// ---------------------------------------------------------------------------
// Permission map — href → required permission
// ---------------------------------------------------------------------------

const ITEM_PERMISSIONS: Record<string, string> = {
  '/dashboard': Permissions.ADMIN_VIEW_DASHBOARD,
  '/users': Permissions.ADMIN_VIEW_USERS,
  '/businesses': Permissions.ADMIN_VIEW_BUSINESSES,
  '/subscriptions': Permissions.ADMIN_VIEW_SUBSCRIPTIONS,
  '/notifications': Permissions.ADMIN_VIEW_NOTIFICATIONS,
  '/payments': Permissions.ADMIN_VIEW_PAYMENTS,
  '/invoices': Permissions.ADMIN_VIEW_INVOICES,
  '/accounts': Permissions.ADMIN_VIEW_ACCOUNTS,
  '/permissions': Permissions.ADMIN_VIEW_PERMISSIONS,
  '/config': Permissions.ADMIN_VIEW_CONFIG,
  '/audit-logs': Permissions.ADMIN_VIEW_AUDIT_LOGS,
  // QA items — gated by existing QA permission
  '/qa': Permissions.QA_RUN_TEST,
  '/qa/tests': Permissions.QA_RUN_TEST,
  '/qa/defects': Permissions.QA_RUN_TEST,
  '/qa/environment': Permissions.QA_RUN_TEST,
}

// ---------------------------------------------------------------------------
// Nav groups
// ---------------------------------------------------------------------------

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    href: '/dashboard',
    icon: <LayoutDashboardIcon className='size-4' />,
    items: [{ label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboardIcon className='size-3.5' /> }],
  },
  {
    label: 'Tenants',
    href: '/users',
    icon: <UsersIcon className='size-4' />,
    items: [
      { label: 'Users', href: '/users', icon: <UserIcon className='size-3.5' /> },
      { label: 'Businesses', href: '/businesses', icon: <BriefcaseIcon className='size-3.5' /> },
      { label: 'Subscriptions', href: '/subscriptions', icon: <LayersIcon className='size-3.5' /> },
      { label: 'Notifications', href: '/notifications', icon: <BellIcon className='size-3.5' /> },
    ],
  },
  {
    label: 'Billing',
    href: '/payments',
    icon: <CreditCardIcon className='size-4' />,
    items: [
      { label: 'Payments', href: '/payments', icon: <CreditCardIcon className='size-3.5' /> },
      { label: 'Invoices', href: '/invoices', icon: <ReceiptIcon className='size-3.5' /> },
    ],
  },
  {
    label: 'Platform',
    href: '/accounts',
    icon: <ServerIcon className='size-4' />,
    items: [
      { label: 'Accounts', href: '/accounts', icon: <UsersIcon className='size-3.5' /> },
      { label: 'Permissions', href: '/permissions', icon: <ShieldIcon className='size-3.5' /> },
      { label: 'Platform Config', href: '/config', icon: <SlidersIcon className='size-3.5' /> },
      { label: 'Audit Logs', href: '/audit-logs', icon: <FileTextIcon className='size-3.5' /> },
    ],
  },
  {
    label: 'QA Companion',
    href: '/qa',
    icon: <ClipboardCheckIcon className='size-4' />,
    items: [
      { label: 'Campaigns', href: '/qa', icon: <TrophyIcon className='size-3.5' /> },
      { label: 'All Tests', href: '/qa/tests', icon: <ListIcon className='size-3.5' /> },
      { label: 'Defects', href: '/qa/defects', icon: <BugIcon className='size-3.5' /> },
      { label: 'Environment', href: '/qa/environment', icon: <FlaskConicalIcon className='size-3.5' /> },
    ],
  },
]

// ---------------------------------------------------------------------------
// AdminSidebar
// ---------------------------------------------------------------------------

export function AdminSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation()
  const user = useAuthenticatedUser()
  const userPerms = new Set<string>((user as { authorization?: { permissions?: string[] } } | null)?.authorization?.permissions ?? [])

  const canSee = (href: string) => {
    const required = ITEM_PERMISSIONS[href]
    // If no permission is mapped (e.g. future items), show by default
    if (!required) return true
    return userPerms.has(required)
  }

  const isSubActive = (href: string) => {
    if (href === '/qa') return location.pathname === '/qa'
    return location.pathname === href || location.pathname.startsWith(`${href}/`)
  }

  const isGroupActive = (group: NavGroup) => group.items.some(sub => isSubActive(sub.href))

  // Filter items and groups based on permissions
  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(sub => canSee(sub.href)),
  })).filter(group => group.items.length > 0)

  return (
    <Sidebar collapsible='icon' {...props}>
      {/* Header — brand */}
      <SidebarHeader>
        <div className='flex gap-2 py-2'>
          <div className='bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg'>
            <BrandIcon />
          </div>
          <div className='grid flex-1 text-left text-sm leading-tight'>
            <span className='truncate font-medium'>{APP_NAME}</span>
            <span className='truncate text-xs text-muted-foreground'>Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>

      {/* Grouped accordion nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {visibleGroups.map(group => (
              <Collapsible key={group.href} asChild defaultOpen={isGroupActive(group)} className='group/collapsible'>
                <SidebarMenuItem>
                  {/* Group header — acts as accordion trigger */}
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={group.label} isActive={isGroupActive(group)}>
                      {group.icon}
                      <span>{group.label}</span>
                      <ChevronRightIcon className='ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90' />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>

                  {/* Sub-items */}
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {group.items.map(sub => (
                        <SidebarMenuSubItem key={sub.href}>
                          <SidebarMenuSubButton asChild isActive={isSubActive(sub.href)}>
                            <Link to={sub.href as never}>
                              {sub.icon}
                              <span>{sub.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
