/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// Astro's Vite setup: aliases and image imports work as in the site.
export default getViteConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
