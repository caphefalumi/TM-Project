// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  
  ssr: false, // SPA mode to maintain current behavior
  
  devServer: {
    port: 5173
  },
  
  modules: [
    '@pinia/nuxt',
    'vuetify-nuxt-module'
  ],

  vuetify: {
    moduleOptions: {
      /* module specific options */
    },
    vuetifyOptions: {
      /* vuetify options */
    }
  },

  runtimeConfig: {
    public: {
      clientId: process.env.VITE_CLIENT_ID || '',
      apiPort: process.env.VITE_API_PORT || '',
      dev: process.env.VITE_DEV || 'false',
    }
  },

  vite: {
    server: {
      port: 5173,
      hmr: {
        overlay: false,
      },
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
      drop: ['console', 'debugger'],
    },
  },

  app: {
    head: {
      title: 'Team Management',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { 
          name: 'description', 
          content: 'Collaborate, manage teams, assign tasks, and boost productivity with Team Management at tm-project.id.vn. Modern, secure, and easy to use for all your project needs.' 
        },
        { 
          name: 'keywords', 
          content: 'team management, project collaboration, productivity, tasks, teams, project management, workspace, assignments, notifications, roles, tm-project.id.vn' 
        },
        { property: 'og:title', content: 'Team Management' },
        { 
          property: 'og:description', 
          content: 'Collaborate, manage teams, assign tasks, and boost productivity with Team Management at tm-project.id.vn. Modern, secure, and easy to use for all your project needs.' 
        },
        { property: 'og:image', content: 'https://tm-project.id.vn/favicon.ico' },
        { property: 'og:url', content: 'https://tm-project.id.vn/' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Team Management' },
        { 
          name: 'twitter:description', 
          content: 'Collaborate, manage teams, assign tasks, and boost productivity with Team Management at tm-project.id.vn.' 
        },
        { name: 'twitter:image', content: 'https://tm-project.id.vn/favicon.ico' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { 
          rel: 'stylesheet', 
          href: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap' 
        },
      ],
      style: [
        {
          children: `
            body {
              font-family: 'Roboto', sans-serif;
              margin: 0;
              padding: 0;
            }
          `
        }
      ]
    },
  },
})
