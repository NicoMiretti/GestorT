import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0d10",
        panel: "#13161b",
        border: "#262a31",
        text: "#e6e8eb",
        muted: "#8a929c",
        accent: "#7aa2f7",
        ok: "#9ece6a",
        warn: "#e0af68",
        danger: "#f7768e",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
