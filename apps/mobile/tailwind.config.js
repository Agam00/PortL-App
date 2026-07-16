/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Portl design system — see apps/mobile/DESIGN_SYSTEM.md (source: Stitch export,
        // "Friendly Community Console"). Light mode, warm off-white + saturated violet accent,
        // big soft radii, ambient shadows instead of hairline borders.
        background: "#FDF8FF",
        surface: "#FFFFFF",
        "surface-container": "#F1ECF8",
        "surface-container-high": "#ECE6F2",
        "on-surface": "#1C1A23",
        "on-surface-variant": "#48454F",
        "text-muted": "#797585",
        outline: "#797585",
        "outline-variant": "#CAC4D6",
        primary: "#6244CD",
        "primary-container": "#7B5FE8",
        "inverse-primary": "#4A27B5",
        secondary: "#845400",
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
