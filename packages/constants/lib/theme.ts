/**
 * theme.ts
 *
 * Brand color constants for StartPOS.
 *
 * The web app uses OKLCH tokens defined in styles.css (Tailwind v4 CSS variables).
 * This file provides those same brand colors as plain values so non-CSS contexts
 * can reference them — e.g. @react-pdf/renderer, email templates, Stripe
 * Appearance config, and any future native or server-rendered surface.
 *
 * OKLCH values match styles.css exactly.
 * HEX values are the closest sRGB equivalents — use for contexts that require hex.
 *
 * When the palette changes, update both this file and styles.css together.
 */

// ---------------------------------------------------------------------------
// Primary — Emerald
// Light: oklch(0.64 0.16 168.25)  ≈ #10b981  (Tailwind emerald-500/600)
// Dark:  oklch(0.72 0.16 168.25)  ≈ #34d399  (Tailwind emerald-400/500)
// ---------------------------------------------------------------------------
export const COLOR_PRIMARY = {
  /** OKLCH — use in CSS custom properties and Tailwind v4 themes */
  oklch: 'oklch(0.64 0.16 168.25)',
  /** OKLCH dark-mode variant */
  oklchDark: 'oklch(0.72 0.16 168.25)',
  /** HEX — use in non-CSS contexts (PDFs, emails, Stripe config) */
  hex: '#10b981',
  /** HEX dark-mode variant */
  hexDark: '#34d399',
  /** Foreground color on top of primary background (light mode) */
  foregroundOklch: 'oklch(0.985 0 0)',
  foregroundHex: '#fafafa',
} as const

// ---------------------------------------------------------------------------
// Secondary — Amber/Gold
// Sourced from calling card --accent-sell: #f2a73c / --accent-sell-text: #b06f1a
// Pairs with the emerald primary to give the brand a warm energy contrast.
// Light: oklch(0.78 0.14 68)  ≈ #f2a73c
// Dark:  oklch(0.65 0.15 68)  ≈ #d4861a
// ---------------------------------------------------------------------------
export const COLOR_SECONDARY = {
  /** OKLCH — use in CSS custom properties and Tailwind v4 themes */
  oklch: 'oklch(0.78 0.14 68)',
  /** OKLCH dark-mode variant */
  oklchDark: 'oklch(0.65 0.15 68)',
  /** HEX — use in non-CSS contexts (PDFs, emails, Stripe config) */
  hex: '#f2a73c',
  /** HEX dark-mode variant */
  hexDark: '#d4861a',
  /** Foreground/text color on top of secondary background */
  foregroundOklch: 'oklch(0.4 0.1 55)',
  foregroundHex: '#b06f1a',
  /** Foreground/text color in dark mode */
  foregroundOklchDark: 'oklch(0.95 0.05 68)',
  foregroundHexDark: '#fef3c7',
} as const

// ---------------------------------------------------------------------------
// Accent — Emerald tint (used for hover states, badges, highlights)
// Light: oklch(0.94 0.03 168.25)  ≈ #d1fae5
// Dark:  oklch(0.3 0.08 168.25)   ≈ #065f46
// ---------------------------------------------------------------------------
export const COLOR_ACCENT = {
  oklch: 'oklch(0.94 0.03 168.25)',
  oklchDark: 'oklch(0.3 0.08 168.25)',
  hex: '#d1fae5',
  hexDark: '#065f46',
} as const

// ---------------------------------------------------------------------------
// Destructive — Red
// oklch(0.58 0.22 27)  ≈ #dc2626
// ---------------------------------------------------------------------------
export const COLOR_DESTRUCTIVE = {
  oklch: 'oklch(0.58 0.22 27)',
  oklchDark: 'oklch(0.704 0.191 22.216)',
  hex: '#dc2626',
  hexDark: '#f87171',
} as const
