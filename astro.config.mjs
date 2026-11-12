import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://kalibrovkasession.ru",
  output: "static",
  trailingSlash: "always",
  build: {
    format: "directory",
  },
});
