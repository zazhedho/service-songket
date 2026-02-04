/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        slatebg: '#0f172a',
        card: '#111827',
        muted: '#1f2937',
        accent: '#22c55e',
        accent2: '#38bdf8',
      },
      boxShadow: {
        card: '0 10px 30px rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
