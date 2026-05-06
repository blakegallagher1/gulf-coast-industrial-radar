import type { Config } from "tailwindcss";

/**
 * Brick & Yield design system — "The Pilot House".
 *
 * The colour names are stable; the values are tuned for an industrial-intelligence
 * console: deep ink, oxidized bone paper, phosphor amber for signal, cinnabar for
 * hazard, patina teal for watch. Numeric scales follow ink-1..4 and bone-1..4.
 */
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        display: [
          "Instrument Serif",
          "ui-serif",
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif",
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
        // ── Ink (near-black, oil-based) ────────────────────────────────────
        ink: {
          DEFAULT: "#0c100e",
          2: "#1a201d",
          3: "#3a4541",
          4: "#5b6b66",
        },

        // ── Bone (oxidized paper) ─────────────────────────────────────────
        bone: {
          DEFAULT: "#f4ede0",
          2: "#ece4d3",
          3: "#e1d8c4",
          4: "#cabe9f",
        },

        // ── Mid greys with green undertone ────────────────────────────────
        muted: {
          DEFAULT: "#7a847f",
          2: "#9aa39e",
        },

        // ── Hairline rules ────────────────────────────────────────────────
        line: {
          DEFAULT: "#cbc1ae",      // bone-mode rule
          2: "#dcd2bc",
          dark: "#22302b",         // ink-mode rule
          "dark-2": "#324137",
        },

        // ── Background tokens for compatibility with existing classes ────
        bg: {
          DEFAULT: "#f4ede0",
          2: "#ece4d3",
          3: "#e1d8c4",
          4: "#d3c9b1",
        },

        // ── Phosphor amber — the signal accent ────────────────────────────
        accent: {
          DEFAULT: "#e9a539",      // sodium phosphor
          ink: "#a96f17",
          soft: "rgba(233,165,57,0.12)",
        },

        // ── Hazard cinnabar (high score / siren) ─────────────────────────
        crit: {
          DEFAULT: "#c9402a",
          soft: "rgba(201,64,42,0.10)",
        },

        // ── Watch — patina teal ──────────────────────────────────────────
        info: {
          DEFAULT: "#2f7575",
          soft: "rgba(47,117,117,0.10)",
        },

        // ── Caution — burnished ochre ────────────────────────────────────
        warn: {
          DEFAULT: "#a87016",
          soft: "rgba(168,112,22,0.10)",
        },

        // ── Phosphor green for live state on dark surfaces ───────────────
        phosphor: {
          DEFAULT: "#7dd6a3",
          dim: "#3d8a5a",
        },
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "5px",
        md: "7px",
        lg: "10px",
        xl: "14px",
      },
      boxShadow: {
        sm: "0 1px 0 rgba(12,16,14,0.05)",
        md: "0 6px 22px rgba(12,16,14,0.08), 0 1px 0 rgba(12,16,14,0.04)",
        lg: "0 24px 60px -20px rgba(12,16,14,0.30), 0 4px 14px rgba(12,16,14,0.10)",
        inset: "inset 0 0 0 1px rgba(12,16,14,0.06)",
        glow: "0 0 0 1px rgba(233,165,57,0.35), 0 0 24px rgba(233,165,57,0.18)",
      },
      letterSpacing: {
        tighter: "-0.024em",
        tight: "-0.014em",
        widest: "0.18em",
      },
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "sweep": {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "scan": {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        "ping-soft": {
          "0%":         { transform: "scale(1)",   opacity: "0.55" },
          "70%, 100%":  { transform: "scale(2.4)", opacity: "0"    },
        },
        "ticker": {
          "0%":   { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fade-in 0.6s ease-out both",
        "sweep": "sweep 7s linear infinite",
        "scan": "scan 8s linear infinite",
        "ping-soft": "ping-soft 2.4s cubic-bezier(0,0,0.2,1) infinite",
        "ticker": "ticker 60s linear infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
