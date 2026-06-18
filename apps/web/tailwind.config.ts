import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          ink: "#17212b",
          panel: "#f7f8f4",
          line: "#cfd7d1",
          green: "#168a4a",
          amber: "#a56205",
          red: "#b42318",
          blue: "#1d5fd0"
        }
      }
    }
  },
  plugins: []
};

export default config;

