import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0a0b0d",
        surface: "#111318",
        border: "#1e2229",
        green: {
          DEFAULT: "#00e676",
          500: "#00e676",
          600: "#00c853",
        },
        amber: {
          DEFAULT: "#ffab00",
          500: "#ffab00",
          600: "#ff8f00",
        },
        red: {
          DEFAULT: "#ff3d57",
          500: "#ff3d57",
          600: "#d32f2f",
        },
        blue: {
          DEFAULT: "#448aff",
          500: "#448aff",
          600: "#2979ff",
        },
        text: {
          primary: "#e8ecf0",
          secondary: "#8b95a8",
        },
      },
      fontFamily: {
        mono: ["DM Mono", "Fira Code", "monospace"],
        sans: ["DM Sans", "Inter", "sans-serif"],
      },
      backgroundImage: {
        scanlines:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        blink: "blink 1s step-end infinite",
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
