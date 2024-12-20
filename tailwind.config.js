/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,js, jsx,ts}",
  ],
  // prefix: "asar-",
  theme: {
    extend: {
      colors: {
        themeColor: "linear-gradient(125deg, #3cb0fd 0, #6c5ce7 140%)",
        themeHoverColor: "#3cb0fd !important",
      },
      screens: {
        "2.5xl": "1830px",
        "3xl": "2200px",
      },
    },
  },
  plugins: [],
};