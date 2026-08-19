/** @type {import('tailwindcss').Config} */
export default {
   darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backdropBlur: {
        xs: "2px",
      },
    },
  },

  daisyui: {
    themes: [
      {
        mytheme: {
          primary: "#F97316",
          secondary: "#0F766E",
          accent: "#F59E0B",

          "base-100": "#FFF7ED",
          neutral: "#131110",

          success: "#14B8A6",
          warning: "#F5900B",
          error: "#EF4444",
        },
      },
    ],
  },

  plugins: [require("daisyui")],
};
