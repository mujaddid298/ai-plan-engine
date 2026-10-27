import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        apple: {
          blue: "#2997ff",
          "blue-light": "#0071e3",
          bg: "#000000",
          surface: "#1d1d1f",
          elevated: "#272729",
          border: "#333336",
          text: "#f5f5f7",
          muted: "#86868b",
          green: "#30d158",
          yellow: "#ffd60a",
          red: "#ff453a",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Inter"',
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          '"SF Mono"',
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      borderRadius: {
        appleSm: "5px",
        appleMd: "8px",
        appleLg: "11px",
        appleXl: "12px",
        pill: "980px",
      },
      boxShadow: {
        appleCard: "3px 5px 30px rgba(0, 0, 0, 0.22)",
      },
      letterSpacing: {
        apple: "-0.015em",
        appleTight: "-0.025em",
      },
    },
  },
  plugins: [],
};
export default config;
