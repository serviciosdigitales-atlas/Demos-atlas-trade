import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

// GitHub Pages sirve el sitio bajo /<nombre-del-repo>/.
// En dev usamos "/" para que arranque en localhost sin prefijo.
const base = process.env.NODE_ENV === "production" ? "/Demos-atlas-trade/" : "/";

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 3001,
  },
});
