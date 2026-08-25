import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#d0021b",
          light: "#ff3b3b",
          dark: "#a10015",
        },
        category: {
          security: "#d0021b",
          data: "#1a56db",
          web: "#0e9488",
          docs: "#7c3aed",
          devtools: "#334155",
          productivity: "#d97706",
          other: "#6b7280",
        },
      },
    },
  },
  plugins: [],
};

export default config;
