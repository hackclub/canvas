import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
// A static site with no backend: `pnpm generate` prerenders every page into .output/public.
// The ships and shop items are snapshots in app/data, their images are in public/images.
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  modules: [
    '@nuxt/fonts',
    '@nuxt/icon',
    '@nuxt/image',
    '@nuxt/hints',
  ],

  // No server to fetch icons from, so the ones the pages use are bundled in
  icon: {
    clientBundle: { scan: true },
  },

  nitro: {
    prerender: {
      routes: ['/', '/submissions'],
      crawlLinks: true,
    },
  },

  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
