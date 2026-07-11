import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
// PWA (vite-plugin-pwa) is deliberately NOT wired yet — deferred to a later
// milestone per HERMES.md (M0 is scaffold-only, matching Pluto's M0 precedent
// where PWA + the 3D anchor were both deferred to M6). vite-plugin-pwa stays
// pinned in package.json so it's a one-line addition when that milestone lands.
export default defineConfig({
  server: {
    host: "::",
    port: 8110,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-select", "@radix-ui/react-popover", "@radix-ui/react-tooltip", "@radix-ui/react-dropdown-menu"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
});
