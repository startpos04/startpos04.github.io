/**
 * dev-tools.tsx — Shared TanStack devtools panel.
 *
 * Plugins included:
 *   - TanStack Router  (route tree, active route, loader data, search params)
 *   - TanStack Query   (cache, query status, stale/fresh state, manual refetch)
 *   - TanStack Form    (form state, field values, validation errors, submit status)
 *   - Network          (server function calls + SSR events via Vite event bus —
 *                       built into the panel when connectToServerBus: true)
 *
 * Dev-only. import.meta.env.DEV is statically replaced by Vite — the entire
 * component tree and all plugin imports are dead-code-eliminated in production.
 *
 * Mount once in each app's shell (__root.tsx), after <Scripts />:
 *   import { DevTools } from '@platform/components/custom/dev-tools'
 *   <DevTools />
 */

import { lazy, Suspense } from 'react'

const DevtoolsPanel = lazy(async () => {
  const [{ TanStackDevtools }, { TanStackRouterDevtoolsPanel }, { ReactQueryDevtoolsPanel }, { formDevtoolsPlugin }] = await Promise.all([
    import('@tanstack/react-devtools'),
    import('@tanstack/react-router-devtools'),
    import('@tanstack/react-query-devtools'),
    import('@tanstack/react-form-devtools'),
  ])

  return {
    default: function DevtoolsPanelInner() {
      return (
        <TanStackDevtools
          config={{ position: 'bottom-left' }}
          // connectToServerBus wires up the Network tab — shows server function
          // calls, SSR timing, and other server-side events from the Vite plugin.
          eventBusConfig={{ connectToServerBus: true }}
          plugins={[
            {
              name: 'TanStack Router',
              // router prop is optional — auto-resolved from RouterContext
              render: <TanStackRouterDevtoolsPanel />,
            },
            {
              name: 'TanStack Query',
              render: <ReactQueryDevtoolsPanel />,
            },
            // formDevtoolsPlugin() returns a ready-made plugin object —
            // it tracks every form mounted anywhere in the app automatically.
            formDevtoolsPlugin(),
          ]}
        />
      )
    },
  }
})

/**
 * Drop into any app's shell. Self-disables in production with zero bundle cost.
 */
export function DevTools() {
  if (!import.meta.env.DEV) return null

  return (
    <Suspense fallback={null}>
      <DevtoolsPanel />
    </Suspense>
  )
}
