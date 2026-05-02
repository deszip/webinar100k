// Runtime configuration. PUBLIC_* values are exposed to the browser bundle.
// Server-only secrets must be read inside API routes via import.meta.env directly.

export const siteConfig = {
  url: import.meta.env.PUBLIC_SITE_URL ?? 'http://localhost:4321',
};

export const analyticsConfig = {
  ga4MeasurementId: import.meta.env.PUBLIC_GA_MEASUREMENT_ID ?? '',
  fbPixelId: import.meta.env.PUBLIC_FB_PIXEL_ID ?? '',
};

export const wayforpayConfig = {
  merchantAccount: import.meta.env.PUBLIC_WAYFORPAY_MERCHANT_ACCOUNT ?? 'test_merch_n1',
  merchantDomain: import.meta.env.PUBLIC_WAYFORPAY_MERCHANT_DOMAIN ?? 'localhost',
};
