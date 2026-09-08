/**
 * legal-footer.tsx
 *
 * Shared footer rendered on public pages (login, register, forgot-password)
 * and legal pages (/terms, /privacy).
 *
 * Contains:
 *   - Copyright
 *   - Links to Terms of Service and Privacy Policy
 */

import { APP_NAME } from '@platform/lib/constants'
import { BRAND_WEBSITE_URL } from '@startpos/constants/lib/contact'

export function LegalFooter() {
  return (
    <footer className='py-1 px-2'>
      <div className='w-full flex flex-col sm:flex-row items-center justify-between gap-1 text-[10px] text-muted-foreground'>
        <p>
          © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
        <div className='flex items-center gap-4'>
          <a href={`${BRAND_WEBSITE_URL}/terms`} target='_blank' rel='noopener noreferrer' className='hover:underline underline-offset-4'>
            Terms of Service
          </a>
          <a href={`${BRAND_WEBSITE_URL}/privacy`} target='_blank' rel='noopener noreferrer' className='hover:underline underline-offset-4'>
            Privacy Policy
          </a>
        </div>
      </div>
    </footer>
  )
}
