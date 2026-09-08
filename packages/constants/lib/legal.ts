/**
 * legal.ts
 *
 * Legal document version strings for Terms of Service and Privacy Policy.
 *
 * Bump these strings whenever the ToS or Privacy Policy is materially changed.
 * "Material change" means: new data categories, changed retention periods,
 * altered merchant obligations, or changed billing terms.
 *
 * Old versions are preserved in git history — they establish what each user
 * agreed to at registration or re-acceptance time.
 *
 * These constants are used in:
 *   - complete-registration (written to User on signup)
 *   - accept-terms (written to User on re-acceptance)
 *   - terms-update-modal (compared against User.termsVersion to gate access)
 */

export const CURRENT_TERMS_VERSION = '2026-08-01'
export const CURRENT_PRIVACY_VERSION = '2026-08-01'
