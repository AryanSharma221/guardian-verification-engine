/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#334EEC',
          hover: '#2a41c9',
          light: '#EEF1FD'
        },
        accent: {
          DEFAULT: '#FF8A00',
          hover: '#e67e00'
        },
        background: '#F8F9FB',
        surface: '#FFFFFF',
        border: '#E2E5EB',
        text: {
          primary: '#1A1D26',
          secondary: '#5A6072',
          muted: '#8B92A5'
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#F0FDF4'
        },
        warning: {
          DEFAULT: '#D97706',
          light: '#FFFBEB'
        },
        critical: {
          DEFAULT: '#DC2626',
          light: '#FEF2F2'
        },
        info: {
          DEFAULT: '#4F46E5',
          light: '#EEF2FF'
        }
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
