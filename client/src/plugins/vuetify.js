// filepath: a:\Study\Swinburne\CS\COS30043\My own test\18. Blog\pm-demo\src\plugins\vuetify.js
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { VCalendar } from 'vuetify/labs/VCalendar'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  components: {
    ...components,
    VCalendar,
  },
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#0070F3', // Vercel blue
          secondary: '#7C3AED', // Modern purple
          accent: '#FF0080', // Vibrant pink accent
          error: '#EF4444', // Modern red
          warning: '#F59E0B', // Warm orange
          info: '#3B82F6', // Blue
          success: '#10B981', // Green
          background: '#FAFAFA', // Very light gray
          surface: '#FFFFFF', // White
          'surface-variant': '#F4F4F5', // Light gray for cards
          'on-surface-variant': '#71717A', // Medium gray for text
          'primary-darken-1': '#0061D5',
          'secondary-darken-1': '#6D28D9',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#0070F3',
          secondary: '#8B5CF6',
          accent: '#FF0080',
          error: '#F87171',
          warning: '#FBBF24',
          info: '#60A5FA',
          success: '#34D399',
          background: '#0A0A0A',
          surface: '#171717',
          'surface-variant': '#262626',
          'on-surface-variant': '#A1A1AA',
        },
      },
    },
  },
  defaults: {
    VCard: {
      elevation: 0,
      variant: 'flat',
      class: 'rounded-lg border',
    },
    VBtn: {
      elevation: 0,
      class: 'text-none font-weight-medium',
      style: 'letter-spacing: normal;',
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      color: 'primary',
    },
    VChip: {
      elevation: 0,
    },
    VDataTable: {
      hover: true,
    },
  },
})
