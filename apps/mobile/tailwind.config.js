/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        resident: {
          DEFAULT: "#2563eb",
          light: "#dbeafe",
        },
        guard: {
          DEFAULT: "#d97706",
          light: "#fef3c7",
        },
        admin: {
          DEFAULT: "#334155",
          light: "#e2e8f0",
        },
      },
    },
  },
  plugins: [],
};
