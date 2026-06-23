import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#050507", // page background
          900: "#08080b",
          800: "#0c0c11",
          700: "#13131a", // cards
          600: "#1c1c25", // raised
          500: "#2a2a36", // borders
        },
        accent: {
          DEFAULT: "#2dd4bf", // teal
          soft: "#5eead4",
          deep: "#0d9488",
        },
        glow: {
          violet: "#7c5cff",
          cyan: "#22d3ee",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
      },
      boxShadow: {
        glow: "0 0 60px -15px rgba(45, 212, 191, 0.55)",
        "glow-sm": "0 0 30px -10px rgba(45, 212, 191, 0.5)",
        card: "0 24px 60px -24px rgba(0,0,0,0.85)",
        lift: "0 30px 80px -30px rgba(45,212,191,0.35)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        aurora: {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "33%": { transform: "translate3d(4%, -6%, 0) scale(1.15)" },
          "66%": { transform: "translate3d(-5%, 4%, 0) scale(0.95)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "scroll-cue": {
          "0%": { opacity: "0", transform: "translateY(-6px)" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0", transform: "translateY(10px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s cubic-bezier(0.22,1,0.36,1) both",
        aurora: "aurora 18s ease-in-out infinite",
        "aurora-slow": "aurora 26s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        marquee: "marquee 32s linear infinite",
        shimmer: "shimmer 6s linear infinite",
        "scroll-cue": "scroll-cue 1.8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
