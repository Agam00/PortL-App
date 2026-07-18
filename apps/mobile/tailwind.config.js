/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Portl design system — "Masterji" dark theme: near-black canvas + saturated
        // orange accent, dark elevated surfaces, light text.
        background: "#0D0D0D",
        surface: "#1A1A1A",
        "surface-container": "#242424",
        "surface-container-high": "#2E2E2E",
        "on-surface": "#F5F5F5",
        "on-surface-variant": "#C4C4C4",
        "text-muted": "#8A8A8A",
        outline: "#8A8A8A",
        "outline-variant": "#333333",
        primary: "#F5821F",
        "primary-container": "#FF9A3D",
        "inverse-primary": "#D96D0C",
        secondary: "#FEB246",
        "secondary-container": "#FEB246",
        "status-green": "#27C96D",
        "status-amber": "#FEB246",
        "status-red": "#FF5F5F",
        "status-red-strong": "#BA1A1A",
      },
      fontSize: {
        // Size + line-height + letter-spacing only — apply font-weight separately
        // (font-semibold/font-medium/font-normal) since fontWeight isn't part of
        // Tailwind's fontSize tuple spec.
        "headline-xl": ["40px", { lineHeight: "48px", letterSpacing: "-0.02em" }],
        "headline-lg": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em" }],
        "headline-md": ["24px", { lineHeight: "32px" }],
        "body-lg": ["18px", { lineHeight: "28px" }],
        "body-md": ["16px", { lineHeight: "24px" }],
        "body-sm": ["14px", { lineHeight: "20px" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em" }],
        "meta-text": ["12px", { lineHeight: "16px" }],
      },
      borderRadius: {
        card: "20px",
      },
    },
  },
  plugins: [],
};
