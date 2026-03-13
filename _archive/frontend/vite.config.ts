<<<<<<< HEAD
// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: frontend/vite.config.ts                                                    ║
// ║  LAYER: ui/frontend                                                  ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Removed vite-plugin-obfuscator due to build errors

=======
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

>>>>>>> a3d7d06c432bf92df85e53f8d0cf1e6c8622ccea
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
<<<<<<< HEAD
=======
    proxy: {
      "/api": "http://api.headysystems.com:3300",
    },
>>>>>>> a3d7d06c432bf92df85e53f8d0cf1e6c8622ccea
  },
  build: {
    outDir: "dist",
  },
});
