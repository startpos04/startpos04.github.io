/**
 * contact.ts
 *
 * Brand contact and identity constants for StartPOS.
 * Single source of truth for all contact info used across apps,
 * website, calling card, email templates, and JSON-LD structured data.
 *
 * When any of these change, update here only — all consumers update automatically.
 */

/** Primary contact email address. */
export const CONTACT_EMAIL = 'startpos04@gmail.com'

/** Primary contact phone number (E.164-friendly, Philippines). */
export const CONTACT_PHONE = '+63 939 273 7849'

/** Public-facing website hostname (no protocol). */
export const BRAND_WEBSITE = 'http://localhost:4321'

/** Full website URL with protocol — use for links and QR codes. */
export const BRAND_WEBSITE_URL = `https://${BRAND_WEBSITE}`

/** Physical / mailing address. */
export const BRAND_ADDRESS = 'Bonfal West, Bayombong, Nueva Vizcaya'
