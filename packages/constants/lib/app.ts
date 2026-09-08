/**
 * app.ts
 *
 * Application identity, URL, and brand copy constants.
 * Safe to import from any layer — no infrastructure dependencies.
 */

export const APP_NAME = 'StartPOS'
export const APP_SHORT_NAME = 'POS'

/** The URL to the hosted application — used for trial signup CTAs across all apps and the website. */
export const APP_URL = 'https://startpos04.github.io/'

/** Annual billing discount as a percentage (e.g. 20 = 20% off monthly price). */
export const ANNUAL_DISCOUNT_PCT = 20

// ---------------------------------------------------------------------------
// Brand copy — single source of truth for taglines and descriptions.
// Update here when marketing copy changes; all consumers update automatically.
// ---------------------------------------------------------------------------

/** Short action tagline. Used on calling cards, hero badges, and CTA buttons. */
export const BRAND_TAGLINE = 'Sell. Track. Grow.'

/** Product category line. Used below the wordmark on calling cards and print materials. */
export const BRAND_PRODUCT_LINE = 'Point of Sale + Inventory'

/** Longer brand tagline for print covers and pitch decks. */
export const BRAND_COVER_TAGLINE = 'Your Business. Your Rules. Anywhere.'

/** One-line brand description. Used in footers, meta descriptions, and JSON-LD. */
export const BRAND_DESCRIPTION = 'A modern, offline-first point of sale for retail, restaurant, and grocery.'

/** Extended brand description. Used in about sections and marketing copy. */
export const BRAND_DESCRIPTION_LONG =
  'A modern, offline-first point of sale for retail, restaurant, and grocery. Built for businesses in the Philippines and Southeast Asia.'

/** Trial offer copy — shown in CTAs, trust bars, and pricing pages. */
export const TRIAL_OFFER_COPY = 'Free 30-day trial · No credit card required'

/** Trial duration in days. */
export const TRIAL_DURATION_DAYS = 30

/** Trial transaction limit. */
export const TRIAL_TX_LIMIT = 500
