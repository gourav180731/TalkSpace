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
          primary: "#2563EB",
          secondary: "#3B82F6",
          accent: "#1E40AF",

          "base-100": "#F8FAFC",
          neutral: "#0F172A",

          success: "#22C55E",
          warning: "#F5900B",
          error: "#EF4444",
        },
      },
    ],
  },

  plugins: [require("daisyui")],
};
