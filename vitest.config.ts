/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

// getViteConfig runs Vitest through Astro's Vite setup, so the tsconfig aliases (@i18n/*, @data/*…)
// and image imports resolve exactly as they do in the site.
export default getViteConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
  },
});
