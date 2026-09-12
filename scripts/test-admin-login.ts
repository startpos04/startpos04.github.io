/**
 * test-admin-login.ts
 * Quick script to test admin auth sign-in directly (bypasses HTTP layer)
 */
import { auth } from '../apps/admin/src/lib/better-auth/auth'

async function main() {
  console.log('Testing admin sign-in...')
  try {
    const result = await auth.api.signInEmail({
      body: {
        email: 'superadmin@startpos.com',
        password: '123qwe123!1',
      },
      asResponse: true,
    })
    console.log('Status:', result.status)
    const body = await result.json()
    console.log('Body:', JSON.stringify(body, null, 2))
  } catch (err) {
    console.error('Error:', err)
  }
}

main().catch(console.error)
