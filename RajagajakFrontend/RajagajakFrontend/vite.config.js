import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { colors } from "../../theme/colors.js";

const themeVariables = Object.entries(colors)
  .map(
    ([name, value]) =>
      `--color-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}: ${value};`,
  )
  .join("");

const themeCssPlugin = {
  name: "rajagajak-theme-css",
  transformIndexHtml(html) {
    return html.replace(
      "</head>",
      `<style id="rajagajak-theme">:root{${themeVariables}}</style></head>`,
    );
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), themeCssPlugin],
  server: {
    port: 5173,
    fs: {
      allow: ["../.."],
    },
  },
});
