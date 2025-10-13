export default defineNuxtConfig({
  compatibilityDate: '2025-10-13',

  // App configuration
  app: {
    head: {
      title: 'Teams Management',
      titleTemplate: '%s - Teams Management',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Collaborative team management platform for organizing tasks, projects, and communication' },
        { name: 'format-detection', content: 'telephone=no' },
        // Open Graph / Facebook
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Teams Management' },
        { property: 'og:description', content: 'Collaborative team management platform for organizing tasks, projects, and communication' },
        { property: 'og:site_name', content: 'Teams Management' },
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Teams Management' },
        { name: 'twitter:description', content: 'Collaborative team management platform for organizing tasks, projects, and communication' },
        // Additional SEO
        { name: 'robots', content: 'index, follow' },
        { name: 'author', content: 'Teams Management' },
        { name: 'theme-color', content: '#4a90e2' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'canonical', href: 'https://yourdomain.com' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  },

  // Modules
  modules: [
    '@pinia/nuxt',
  ],

  // CSS
  css: [
    'vuetify/styles',
    '@mdi/font/css/materialdesignicons.css',
  ],

  // Build configuration
  build: {
    transpile: ['vuetify'],
  },

  // Vite configuration
  vite: {
    define: {
      'process.env.DEBUG': false,
    },
    ssr: {
      noExternal: ['vuetify'],
    },
    build: {
      minify: 'esbuild',
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          manualChunks: {
            vue: ['vue'],
            pinia: ['pinia'],
          },
        },
      },
    },
    esbuild: {
      drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    },
    server: {
      port: 5173,
      hmr: {
        overlay: false,
      },
    },
  },

  // Runtime config
  runtimeConfig: {
    public: {
      apiPort: process.env.NUXT_API_PORT || 'http://localhost:3000',
      clientId: process.env.VITE_CLIENT_ID || '',
      isDev: process.env.NUXT_DEV === 'true',
    }
  },

  // Experimental features
  experimental: {
    payloadExtraction: false,
  },
  // SSR configuration
  ssr: false,

  // Directory configuration - Nuxt 3 uses app/ folder
  dir: {
    pages: 'app/pages',
    layouts: 'app/layouts',
    middleware: 'app/middleware',
    plugins: 'app/plugins',
    assets: 'app/assets'
  },

  // Router options
  router: {
    options: {
      strict: false,
      scrollBehaviorType: 'smooth'
    }
  },

  // Nitro configuration
  nitro: {
    prerender: {
      crawlLinks: false,
      routes: ['/']
    }
  },

  // Alias configuration for cleaner imports
  alias: {
    '@': '/app',
    '~': '/',
    '@components': '/app/components',
    '@composables': '/app/composables',
    '@stores': '/app/stores',
    '@utils': '/app/utils',
    '@services': '/app/services'
  },

  // Plugins are auto-imported from app/plugins/ directory
  // No need to manually specify them

  // Components auto-import
  components: {
    dirs: [
      {
        path: '~/app/components',
        pathPrefix: false
      }
    ]
  },

  // Auto-import composables
  imports: {
    dirs: [
      'app/composables',
      'app/utils'
    ]
  },
})
