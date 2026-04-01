/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7fa',
          100: '#667eea',
          600: '#667eea',
          700: '#764ba2',
        },
        accent: '#764ba2',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        'lg': '12px',
      },
    },
  },
  plugins: [],
}
