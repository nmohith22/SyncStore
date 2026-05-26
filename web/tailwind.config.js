/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        main: "var(--color-main)",
        caret: "var(--color-caret)",
        sub: "var(--color-sub)",
        text: "var(--color-text)",
        error: "var(--color-error)",
      },
    },
  },
  plugins: [],
}
