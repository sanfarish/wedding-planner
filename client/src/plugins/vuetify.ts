import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import { createVuetify } from 'vuetify'

const field = { variant: 'outlined', density: 'comfortable', color: 'primary' } as const

export default createVuetify({
  theme: {
    defaultTheme: 'wedding',
    themes: {
      wedding: {
        dark: false,
        colors: {
          background: '#FAF7F2',
          surface: '#FFFFFF',
          'surface-variant': '#F1EBE3',
          'on-surface-variant': '#5B504B',
          primary: '#9E6B6E',
          secondary: '#7D8F7A',
          accent: '#C9A86A',
          error: '#B3412F',
          warning: '#C27C0E',
          success: '#3E7D5A',
          info: '#4F7598',
          'on-background': '#3B3330',
          'on-surface': '#3B3330',
        },
        variables: {
          'border-color': '#3B3330',
          'border-opacity': 0.1,
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', elevation: 0, border: true },
    VBtn: { rounded: 'lg' },
    VTextField: field,
    VTextarea: { ...field, autoGrow: true },
    VSelect: field,
    VAutocomplete: field,
    VCombobox: field,
    VChip: { rounded: 'lg' },
    VDialog: { maxWidth: 640 },
  },
})
