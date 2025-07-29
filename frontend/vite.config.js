import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import basicSsl from "@vitejs/plugin-basic-ssl";
import svgr from "vite-plugin-svgr";

const api_url = process.env.API_URL || "http://inlinkapi.yesducky.com";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl(), svgr()],
  server: {
    https: true,
    host: "0.0.0.0",
    port: 3000,
    open: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    proxy: {
      "/api": {
        target: api_url,
        changeOrigin: true,
        secure: false,
      },
      "/auth": {
        target: api_url,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  optimizeDeps: {
    exclude: ["@yudiel/react-qr-scanner"],
  },
  build: {
    target: "esnext",
  },
});
