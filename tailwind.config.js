/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#B7C4CF", // Light Blue
        primary: "#967E76", // Brown
        secondary: "#EEE3CB", // Beige
        accent: "#D7C0AE", // Tan
      },
      fontFamily: {
        heading: ["Lexend", "Open Sans"],
        base: ["Monsterrat", "Sans"],
        idea: ["Oswald", "Sans"],
      },
    },
  },
  plugins: [],
};
