import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// Astro 5: pages are static by default. Routes can opt out with
// `export const prerender = false` (see src/pages/api/wayforpay/signature.ts),
// which makes that route run as a Vercel serverless function.
export default defineConfig({
  output: 'static',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  compressHTML: true,
});
