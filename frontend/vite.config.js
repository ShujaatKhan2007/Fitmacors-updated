import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite configuration.
// See https://vitejs.dev/config/ for every available option.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
