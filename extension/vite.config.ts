import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Only the popup goes through Vite/React. background.ts and
// content-script.ts are compiled separately via tsc (see
// tsconfig.scripts.json) because MV3 content scripts run as classic
// scripts, not ES modules.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "src/popup/index.html"),
    },
  },
});
