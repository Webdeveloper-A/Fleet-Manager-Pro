import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = Number(process.env.PORT ?? "8081");
const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});