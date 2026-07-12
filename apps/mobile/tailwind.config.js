/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Portl design system — see apps/mobile/DESIGN_SYSTEM.md (source: Stitch export).
        // Dark-mode-only, monochrome-plus-one-accent, Linear-inspired. Tailwind's default
        // rounded-md (6px) / rounded-lg (8px) already match the spec, so no radius overrides needed.
        background: "#131314",
        surface: "#131314",
        "surface-elevated": "#1F2023",
        "surface-container-lowest": "#0e0e0f",
        "surface-container-high": "#2a2a2b",
        "on-surface": "#e5e2e3",
        "on-surface-variant": "#c6c5d5",
        "text-muted": "#8A8F98",
        "border-subtle": "rgba(255,255,255,0.08)",
        "outline-variant": "#454652",
        primary: "#bdc2ff",
        "primary-container": "#5e6ad2",
        "inverse-primary": "#4854bb",
        "status-green": "#4ADE80",
        "status-amber": "#FACC15",
        "status-red": "#F87171",
      },
      fontSize: {
        // Size + line-height + letter-spacing only — apply font-weight separately
        // (font-semibold/font-medium/font-normal) since fontWeight isn't part of
        // Tailwind's fontSize tuple spec.
        "headline-lg": ["22px", { lineHeight: "28px", letterSpacing: "-0.02em" }],
        "headline-md": ["20px", { lineHeight: "24px", letterSpacing: "-0.01em" }],
        "body-md": ["14px", { lineHeight: "20px" }],
        "body-sm": ["13px", { lineHeight: "18px" }],
        "label-caps": ["12px", { lineHeight: "16px", letterSpacing: "0.05em" }],
        "meta-text": ["12px", { lineHeight: "16px" }],
      },
    },
  },
  plugins: [],
};
