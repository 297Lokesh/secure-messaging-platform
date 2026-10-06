import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        signal: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#2c6bed", // Core Signal blue
          600: "#1d57d8",
          700: "#1b4dc1",
          800: "#1e3a8a",
          900: "#172554",
        },
        dark: {
          bg: "#121214", // Signal deep charcoal
          panel: "#1b1b1e", // Signal sidebar
          surface: "#222226", // Signal modal/card surface
          hover: "#26262b",
          border: "#28282c",
          bubble: "#26262b", // Incoming dark bubble
          text: "#f3f4f6",
          muted: "#8e8e93",
        },
        light: {
          bg: "#ffffff",
          panel: "#ffffff",
          surface: "#f6f8fa",
          hover: "#f2f4f7",
          border: "#e5e7eb",
          bubble: "#f1f3f5", // Incoming light bubble
          text: "#111827",
          muted: "#6b7280",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.04)",
        card: "0 4px 16px -2px rgba(0, 0, 0, 0.08)",
        modal: "0 20px 40px -8px rgba(0, 0, 0, 0.2)",
      },
      borderRadius: {
        bubble: "18px",
        "bubble-sm": "14px",
      },
    },
  },
  plugins: [],
};

export default config;
