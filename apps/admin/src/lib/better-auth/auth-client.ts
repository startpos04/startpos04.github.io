import { emailOTPClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/react'

// Server-side uses the internal URL to avoid the public internet round-trip.
// Client-side falls back to window.location.origin so it always hits the correct host/port.
const baseURL =
  typeof window === 'undefined'
    ? (process.env['BETTER_AUTH_INTERNAL_URL'] ?? process.env['BETTER_AUTH_URL'] ?? 'http://localhost:3001')
    : (process.env['BETTER_AUTH_URL'] ?? window.location.origin)

export const authClient = createAuthClient({
  baseURL,
  plugins: [emailOTPClient()],
})
