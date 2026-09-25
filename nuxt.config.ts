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
    // Hackatime OAuth app; overridable with NUXT_HACKATIME_CLIENT_ID / NUXT_HACKATIME_CLIENT_SECRET
    hackatime: {
      clientId: process.env.HACKATIME_CLIENT_ID ?? '',
      clientSecret: process.env.HACKATIME_CLIENT_SECRET ?? '',
    },
  },

  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
