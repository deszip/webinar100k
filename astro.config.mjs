import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel/serverless';

// Hybrid output: pages are prerendered to static HTML by default,
// but API routes (e.g. /api/wayforpay/signature) run as Vercel serverless functions.
export default defineConfig({
  output: 'hybrid',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  compressHTML: true,
});
