/**
 * otp.ts
 *
 * OTP (one-time password) configuration constants shared across all
 * OTP flows (registration email verification, forgot-password reset).
 *
 * OTP_LENGTH must stay in sync with the `emailOTP` plugin configuration
 * in better-auth's auth.ts.
 */

/** Number of digits in every OTP code. Must match the emailOTP plugin config. */
export const OTP_LENGTH = 6

/** How long (in seconds) an OTP code remains valid before it expires. */
export const OTP_EXPIRES_IN_SECONDS = 600 // 10 minutes

/** Maximum number of failed verification attempts before the OTP is invalidated. */
export const MAX_OTP_ATTEMPTS = 3
