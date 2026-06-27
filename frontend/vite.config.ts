import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  // Allow relocating the dep-optimizer cache off cloud-synced folders
  // (OneDrive/Dropbox lock node_modules/.vite and break re-optimization).
  // Defaults to Vite's standard location when the env var is unset.
  cacheDir: process.env.VITE_CACHE_DIR || undefined,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
  },
});
