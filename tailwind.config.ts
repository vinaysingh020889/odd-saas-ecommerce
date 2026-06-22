import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./tenants/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        omd: {
          brown: "#2f1c14",
          saffron: "#d97706",
          gold: "#c89b3c",
          ivory: "#fff8ec",
          sand: "#ead9bd",
          muted: "#7b6656",
          success: "#2e7d4f",
          error: "#b42318",
          ops: "#2563eb"
        }
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
