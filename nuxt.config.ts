import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/eslint',
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/hints',
    'nuxt-auth-utils'
  ],

  runtimeConfig: {
    // Server-only; can also be overridden at runtime with NUXT_DATABASE_URL
    databaseUrl: process.env.DATABASE_URL,
    // Hack Club Auth OAuth app; overridable with NUXT_HCA_CLIENT_ID / NUXT_HCA_CLIENT_SECRET
    hca: {
      clientId: process.env.HCA_CLIENT_ID ?? '',
      clientSecret: process.env.HCA_CLIENT_SECRET ?? '',
    },
    // YSWS Airtable that approved ships are synced to; overridable with NUXT_AIRTABLE_*
    airtable: {
      token: process.env.AIRTABLE_TOKEN ?? '',
      baseId: process.env.AIRTABLE_BASE_ID ?? '',
      // Table name or ID
      table: process.env.AIRTABLE_TABLE ?? '',
    },
    // Hackatime OAuth app; overridable with NUXT_HACKATIME_CLIENT_ID / NUXT_HACKATIME_CLIENT_SECRET
    hackatime: {
      clientId: process.env.HACKATIME_CLIENT_ID ?? '',
      clientSecret: process.env.HACKATIME_CLIENT_SECRET ?? '',
    },
    // Slack bot token, for looking up display names; overridable with NUXT_SLACK_BOT_TOKEN
    slack: {
      botToken: process.env.SLACK_XOXB ?? '',
    },
    // Cloudflare R2 (S3-compatible) for uploaded images; overridable with NUXT_R2_*
    r2: {
      endpoint: process.env.R2_ENDPOINT ?? '',
      region: process.env.R2_REGION ?? 'auto',
      bucket: process.env.R2_BUCKET ?? '',
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    },
  },

  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
