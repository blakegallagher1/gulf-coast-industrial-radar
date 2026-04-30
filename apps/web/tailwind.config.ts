import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        ink: {
          DEFAULT: "#0d0d0d",
          2: "#1f1f1f",
          3: "#3a3a3a",
        },
        muted: {
          DEFAULT: "#6b6b6b",
          2: "#8e8e8e",
        },
        line: {
          DEFAULT: "#e7e5e4",
          2: "#ececec",
        },
        bg: {
          DEFAULT: "#ffffff",
          2: "#fafaf9",
          3: "#f5f5f4",
          4: "#efeeed",
        },
        accent: {
          DEFAULT: "#10a37f",
          ink: "#0e8867",
          soft: "rgba(16,163,127,0.08)",
        },
        warn: { DEFAULT: "#c97a16", soft: "rgba(201,122,22,0.08)" },
        crit: { DEFAULT: "#b3261e", soft: "rgba(179,38,30,0.08)" },
        info: { DEFAULT: "#1f5fa8", soft: "rgba(31,95,168,0.08)" },
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        lg: "14px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(15,15,15,0.04), 0 1px 1px rgba(15,15,15,0.03)",
        md: "0 4px 14px rgba(15,15,15,0.06), 0 1px 2px rgba(15,15,15,0.04)",
        lg: "0 16px 40px rgba(15,15,15,0.08), 0 2px 6px rgba(15,15,15,0.04)",
      },
      letterSpacing: {
        tighter: "-0.022em",
        tight: "-0.012em",
      },
    },
  },
  plugins: [],
} satisfies Config;
