import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f9ff",
          500: "#0ea5e9",
          600: "#0284c7",
          900: "#0c4a6e",
        },
        up:   "#ef4444",
        down: "#3b82f6",
        buy:  "#16a34a",
        sell: "#dc2626",
        hold: "#d97706",
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
} satisfies Config;
