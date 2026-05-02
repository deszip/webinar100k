# Webinar 100K — Landing Page

Astro + Vercel landing page for the "How a blogger earns 100K" online course.
Mobile-first, Ukrainian copy, dark modern theme.

## Stack

- **Astro 4** (hybrid output) — page is prerendered to static HTML; only the
  WayForPay signing endpoint runs as a Vercel serverless function.
- **`@astrojs/vercel`** adapter — `serverless` mode.
- **WayForPay** widget — payments.
- **Google Analytics 4 + Meta Pixel** — analytics, injected only when env IDs are set.

## Project layout

```
src/
  config.ts                       # reads env vars (analytics + WayForPay public values)
  data/content.ts                 # ALL Ukrainian copy + pricing — edit here
  layouts/BaseLayout.astro        # HTML shell (meta, fonts, analytics)
  components/
    Header.astro
    analytics/
      GoogleAnalytics.astro
      FacebookPixel.astro
    sections/
      Hero.astro
      TargetAudience.astro
      ProblemSolution.astro
      CourseStructure.astro
      LearningOutcomes.astro
      Testimonials.astro
      About.astro
      CelebrityTestimonials.astro
      Pricing.astro                # buy buttons trigger WayForPay
      FAQ.astro
      Footer.astro
  pages/
    index.astro                    # composes the sections in order
    thank-you.astro                # post-payment landing
    api/wayforpay/signature.ts     # POST — server-only HMAC_MD5 signing
  scripts/wayforpay.ts             # client widget loader
  styles/global.css                # design tokens + base styles
public/
  favicon.svg
.env / .env.example                # config
```

## Editing content

Open `src/data/content.ts`. Every section has its own object. Change any string
or array item — no template edits required. Tariff prices, plan names, and
includes lists also live here.

## Environment variables

Copy `.env.example` to `.env.local` for production. All `PUBLIC_*` values are
exposed to the browser; `WAYFORPAY_MERCHANT_SECRET_KEY` is server-only.

| Variable                                | Purpose                                                      |
| --------------------------------------- | ------------------------------------------------------------ |
| `PUBLIC_SITE_URL`                       | Canonical site URL                                           |
| `PUBLIC_GA_MEASUREMENT_ID`              | GA4 ID (`G-…`). Empty = no GA injected                       |
| `PUBLIC_FB_PIXEL_ID`                    | Meta Pixel ID. Empty = no Pixel injected                     |
| `PUBLIC_WAYFORPAY_MERCHANT_ACCOUNT`     | WayForPay merchant account login                             |
| `PUBLIC_WAYFORPAY_MERCHANT_DOMAIN`      | Domain registered with WayForPay                             |
| `WAYFORPAY_MERCHANT_SECRET_KEY`         | **Server-only** — used to sign payment requests              |

In Vercel, set these in **Project → Settings → Environment Variables**.

## Local development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs .vercel/output/
```

## Deploy

Push to a Git repo and import into Vercel — the adapter handles the rest. No
extra Vercel config files needed.

## How payments work

1. User clicks a tariff CTA in `Pricing.astro`.
2. `src/scripts/wayforpay.ts` POSTs the product details to
   `/api/wayforpay/signature`.
3. The server generates an `orderReference` and HMAC_MD5 `merchantSignature`
   using the secret key, returning the full pay payload.
4. The client lazy-loads `https://secure.wayforpay.com/server/pay-widget.js`
   and runs the WayForPay widget with that payload.
5. On approval the user is redirected to `/thank-you?order=…`.
6. Both GA `purchase` and Meta Pixel `Purchase` events fire on success;
   `begin_checkout` / `InitiateCheckout` fire on click.

## What to wire later

- Real WayForPay merchant credentials (replace test values in `.env`).
- Real GA4 + FB Pixel IDs.
- A WayForPay **service URL** webhook (server-to-server confirmation) — current
  flow uses only the client callback. Add an `/api/wayforpay/callback` endpoint
  when ready.
- Replace placeholder author/testimonial avatars (initials) with real `<img>`
  tags. The `.avatar` class accepts both — swap in `<img class="avatar" …>`.
- Real `/offer` and `/privacy` pages (links exist in footer).
