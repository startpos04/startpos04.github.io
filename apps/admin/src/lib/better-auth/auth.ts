import { prisma } from '@platform/lib/prisma-client'
import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailOTP } from 'better-auth/plugins'
import { AdminRole } from 'prisma/generated/prisma/enums'
import { Resend } from 'resend'

// ---------------------------------------------------------------------------
// Admin auth instance — uses AdminUser/AdminSession/AdminAccount tables.
// Completely isolated from the tenant User/Session/Account tables.
// Tenant users cannot authenticate here; admin users cannot log into the app.
// ---------------------------------------------------------------------------

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  // Unique cookie name so admin sessions don't collide with the web app's
  // better-auth.session_token cookie (both run on localhost in dev).
  advanced: {
    cookiePrefix: 'admin',
  },
  // Map Better Auth's internal model names → our admin-specific Prisma models
  user: {
    modelName: 'adminUser',
    additionalFields: {
      role: {
        type: 'string',
        required: false,
        defaultValue: AdminRole.SUPPORT,
        input: false,
      },
    },
  },
  session: {
    modelName: 'adminSession',
  },
  account: {
    modelName: 'adminAccount',
  },
  verification: {
    modelName: 'adminVerification',
  },
  // Use dynamic baseURL so Better Auth infers the correct origin from each request.
  // This handles dev (port 3001) vs Docker/production (port 3201) automatically.
  baseURL: { allowedHosts: ['localhost', '127.0.0.1', 'localhost:3001', 'localhost:3201'] },
  trustedOrigins: [
    process.env['BETTER_AUTH_URL'] || '',
    process.env['BETTER_AUTH_INTERNAL_URL'] || '',
    'http://localhost:3001',
    'http://localhost:3201',
    'http://127.0.0.1:3001',
    'https://*.vercel.app',
  ].filter(Boolean),
  secret: process.env['BETTER_AUTH_SECRET'],
  emailAndPassword: {
    enabled: true,
  },
  rateLimit: {
    window: 60,
    max: 10,
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 600,
      resendStrategy: 'reuse',
      sendVerificationOnSignUp: false,
      async sendVerificationOTP({ email, otp, type }) {
        if (type !== 'email-verification') return

        const key = process.env['RESEND_API_KEY']
        if (!key) {
          console.warn('[admin/emailOTP] RESEND_API_KEY not set — skipping email send')
          return
        }

        try {
          const resend = new Resend(key)
          const from = process.env['EMAIL_FROM'] ?? 'onboarding@resend.dev'
          const result = await resend.emails.send({
            from,
            to: email,
            subject: 'Admin panel — your verification code',
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
                <h2 style="font-size: 20px; margin-bottom: 8px;">Admin verification code</h2>
                <p style="color: #555; margin-bottom: 24px;">
                  Enter the code below to verify your admin email. It expires in 10 minutes.
                </p>
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 12px; text-align: center;
                  background: #f4f4f5; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                  ${otp}
                </div>
                <p style="color: #888; font-size: 13px;">
                  If you didn't request this, someone may be attempting to access the admin panel.
                </p>
              </div>
            `,
          })
          if (result.error) console.error('[admin/emailOTP] Send failed:', result.error)
        } catch (error) {
          console.error('[admin/emailOTP] Exception:', error)
        }
      },
    }),
  ],
})

export type Session = typeof auth.$Infer.Session
