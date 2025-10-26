/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  darkMode: 'class', // ✅ Important for .dark theme toggle to work
  theme: {
    extend: {
      colors: {
        "ios-cyan": "57 175 255",
        "ios-violet": "106 92 255",
        "ios-mint": "90 220 170",
        "ios-bg-1": "244 249 255",
        "ios-bg-2": "235 247 255"
      },
      blur: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "24px",
        xl: "48px",
        "2xl": "140px"
      },
      keyframes: {
        floatSlow: {
          "0%": { transform: "translateY(0) translateX(0) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) translateX(6px) rotate(6deg)" },
          "100%": { transform: "translateY(0) translateX(0) rotate(0deg)" }
        },
        floatVerySlow: {
          "0%": { transform: "translateY(0) translateX(0)", opacity: "1" },
          "50%": { transform: "translateY(-30px) translateX(-10px)", opacity: "0.85" },
          "100%": { transform: "translateY(0) translateX(0)", opacity: "1" }
        },
        driftRight: {
          "0%": { transform: "translateX(0)" },
          "50%": { transform: "translateX(18px)" },
          "100%": { transform: "translateX(0)" }
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        floatSlow: "floatSlow 12s ease-in-out infinite",
        floatVerySlow: "floatVerySlow 16s ease-in-out infinite",
        driftRight: "driftRight 9s ease-in-out infinite",
        fadeUp: "fadeUp 520ms cubic-bezier(.2,.9,.2,1) forwards"
      }
    },
  },
  plugins: [],
}
