import { defineConfig } from "astro/config";
import { SITE_BASE } from "./src/lib/paths.mjs";

export default defineConfig({
  site: "https://siyangni.github.io",
  base: SITE_BASE,
  output: "static",
  trailingSlash: "never",
  server: {
    host: true,
    port: 4321,
  },
});
