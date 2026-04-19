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
        primary: {
          50: "#eef4ff",
          100: "#dbe7ff",
          200: "#bdd1ff",
          300: "#93b4ff",
          400: "#5e8cff",
          500: "#3b6df0",
          600: "#2b56d6",
          700: "#2245ae",
          800: "#1d3987",
          900: "#18306e",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 12px rgba(15,23,42,0.04)",
        cardHover: "0 1px 2px rgba(15,23,42,0.06), 0 8px 24px rgba(15,23,42,0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
