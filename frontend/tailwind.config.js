/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "tertiary": "#ffd16f",
        "outline": "#74757a",
        "surface-container": "#171a1f",
        "on-tertiary-fixed-variant": "#614700",
        "surface-container-highest": "#23262c",
        "error-container": "#b92902",
        "on-error": "#450900",
        "surface-container-high": "#1d2025",
        "primary": "#f3ffca",
        "surface-dim": "#0c0e12",
        "tertiary-fixed": "#ffbf00",
        "on-secondary-container": "#e8fbff",
        "on-secondary-fixed-variant": "#005964",
        "outline-variant": "#46484d",
        "surface-variant": "#23262c",
        "on-tertiary": "#614700",
        "on-secondary-fixed": "#003a42",
        "on-error-container": "#ffd2c8",
        "on-surface": "#f6f6fc",
        "surface-bright": "#292c33",
        "on-primary-fixed-variant": "#526900",
        "error-dim": "#d53d18",
        "inverse-primary": "#516700",
        "background": "#0c0e12",
        "error": "#ff7351",
        "primary-fixed-dim": "#beee00",
        "primary-fixed": "#cafd00",
        "secondary-fixed-dim": "#00d7f0",
        "on-tertiary-container": "#563e00",
        "primary-container": "#cafd00",
        "primary-dim": "#beee00",
        "secondary": "#00e3fd",
        "tertiary-dim": "#eeb200",
        "inverse-surface": "#f9f9ff",
        "inverse-on-surface": "#53555a",
        "secondary-fixed": "#26e6ff",
        "tertiary-container": "#ffbf00",
        "secondary-dim": "#00d4ec",
        "on-primary": "#516700",
        "surface-container-low": "#111318",
        "surface": "#0c0e12",
        "on-primary-container": "#4a5e00",
        "secondary-container": "#006875",
        "surface-container-lowest": "#000000",
        "surface-tint": "#f3ffca",
        "on-background": "#f6f6fc",
        "on-surface-variant": "#aaabb0",
        "on-tertiary-fixed": "#3d2b00",
        "on-secondary": "#004d57",
        "tertiary-fixed-dim": "#eeb200",
        "on-primary-fixed": "#3a4a00",
        dark: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155'
        },
        "brand-primary": {
          500: '#3b82f6',
          400: '#60a5fa'
        },
        accent: {
          neon: '#00f6ff',
          pink: '#ff007f'
        }
      },
      borderRadius: {
        "DEFAULT": "0.125rem",
        "lg": "0.25rem",
        "xl": "0.5rem",
        "full": "0.75rem"
      },
      fontFamily: {
        "headline": ["Space Grotesk", "sans-serif"],
        "body": ["Inter", "sans-serif"],
        "label": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
