// filepath: a:\Study\Swinburne\CS\COS30043\My own test\18. Blog\pm-demo\src\plugins\vuetify.js
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'
import { VCalendar } from 'vuetify/labs/VCalendar'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'
import { md3 } from 'vuetify/blueprints'
import { md2 } from 'vuetify/blueprints'
import { md1 } from 'vuetify/blueprints'

export default createVuetify({
  // blueprint: md2,
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
})
