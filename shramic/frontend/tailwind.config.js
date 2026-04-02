/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        primary:   { DEFAULT: "#2d6a4f", light: "#52b788", dark: "#1b4332" },
        accent:    { DEFAULT: "#f4a261", dark: "#e76f51" },
        soil:      { DEFAULT: "#8b5e3c", light: "#c9a87c" },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        body:    ["'DM Sans'", "sans-serif"],
      },
    }
  },
  plugins: [],
}
