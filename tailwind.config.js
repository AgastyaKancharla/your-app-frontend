/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  corePlugins: {
    preflight: false
  },
  theme: {
    extend: {
      colors: {
        crm: {
          ink: "#171226",
          muted: "#6f678a",
          lilac: "#f3ecff",
          lavender: "#e6d8ff",
          violet: "#7c3aed",
          iris: "#a855f7",
          rose: "#fdf2ff",
          mint: "#d9fff2",
          amber: "#fff1d6",
          border: "#eadcf9",
          surface: "#ffffff",
          sky: "#eef4ff"
        }
      },
      boxShadow: {
        crm: "0 24px 48px rgba(124, 58, 237, 0.12)",
        "crm-soft": "0 12px 24px rgba(139, 92, 246, 0.08)"
      },
      fontFamily: {
        sans: ['"Inter"', "sans-serif"],
        display: ['"Manrope"', "sans-serif"]
      },
      borderRadius: {
        "4xl": "2rem"
      }
    }
  },
  plugins: []
};
