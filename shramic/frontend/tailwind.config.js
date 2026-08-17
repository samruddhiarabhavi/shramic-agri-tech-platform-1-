/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink:       { DEFAULT: "#1B2A3D", light: "#2C3E54", dark: "#101A26" },
        parchment: { DEFAULT: "#F2EEDD", card: "#FBF9F1", line: "#DFD8BF" },
        marigold:  { DEFAULT: "#D9A62E", light: "#F0C563", dark: "#A87D1B" },
        sindoor:   { DEFAULT: "#C1440E", light: "#E06B32", dark: "#8F310A" },
        olive:     { DEFAULT: "#5B6E44", light: "#7C9260", dark: "#3F4E2F" },
        primary:   { DEFAULT: "#1B2A3D", light: "#2C3E54", dark: "#101A26" },
      },
      fontFamily: {
        display: ["'Big Shoulders Display'", "sans-serif"],
        body:    ["'IBM Plex Sans'", "sans-serif"],
        mono:    ["'IBM Plex Mono'", "monospace"],
      },
    }
  },
  plugins: [],
}