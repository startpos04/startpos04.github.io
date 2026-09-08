/**
 * @startpos/constants
 *
 * General-purpose constants shared across all apps in the monorepo.
 * No infrastructure dependencies — safe to import from any layer.
 *
 * Import by domain file for better tree-shaking:
 *   import { APP_NAME } from '@constants/lib/app'
 *   import { OTP_LENGTH } from '@constants/lib/otp'
 *   import { CURRENT_TERMS_VERSION } from '@constants/lib/legal'
 *   import { COMPLIMENTARY_CREDITS } from '@constants/lib/credits'
 *
 * Or import everything via the barrel:
 *   import { APP_NAME, OTP_LENGTH } from '@constants'
 */

export * from './lib/app'
export * from './lib/contact'
export * from './lib/credits'
export * from './lib/legal'
export * from './lib/otp'
export * from './lib/theme'
