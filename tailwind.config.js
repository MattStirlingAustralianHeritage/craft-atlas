/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf7f2',
          100: '#f3ede5',
          200: '#e8d9cc',
          300: '#d9c0a8',
          400: '#c9a07a',
          500: '#C1603A',
          600: '#a84f2f',
          700: '#8c4028',
          800: '#733524',
          900: '#5e2c1f',
          950: '#321510',
        },
        amber: {
          gold: '#C1603A',
        },
        primary: '#C1603A',
        secondary: '#C49A3C',
        accent: '#7A8C7E',
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
