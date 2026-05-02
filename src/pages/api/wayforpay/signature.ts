import type { APIRoute } from 'astro';
import crypto from 'node:crypto';

// Don't prerender — this needs to run on each request to compute a fresh signature.
export const prerender = false;

// WayForPay docs: signature is HMAC_MD5 over a semicolon-joined list of
// merchantAccount, merchantDomainName, orderReference, orderDate, amount, currency,
// then EACH productName, then EACH productCount, then EACH productPrice.
// https://wiki.wayforpay.com/en/view/852102
function buildSignature(params: {
  merchantAccount: string;
  merchantDomainName: string;
  orderReference: string;
  orderDate: number;
  amount: number;
  currency: string;
  productNames: string[];
  productCounts: number[];
  productPrices: number[];
  secretKey: string;
}): string {
  const parts: (string | number)[] = [
    params.merchantAccount,
    params.merchantDomainName,
    params.orderReference,
    params.orderDate,
    params.amount,
    params.currency,
    ...params.productNames,
    ...params.productCounts,
    ...params.productPrices,
  ];

  const stringToSign = parts.join(';');
  return crypto
    .createHmac('md5', params.secretKey)
    .update(stringToSign, 'utf8')
    .digest('hex');
}

export const POST: APIRoute = async ({ request }) => {
  let body: {
    productName?: string;
    productPrice?: number;
    productCount?: number;
    currency?: string;
    clientEmail?: string;
    clientPhone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const productName = (body.productName ?? '').trim();
  const productPrice = Number(body.productPrice);
  const productCount = Number(body.productCount ?? 1);
  const currency = (body.currency ?? 'UAH').trim();

  if (!productName || !Number.isFinite(productPrice) || productPrice <= 0) {
    return new Response(JSON.stringify({ error: 'Invalid product details' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const merchantAccount = import.meta.env.PUBLIC_WAYFORPAY_MERCHANT_ACCOUNT;
  const merchantDomainName = import.meta.env.PUBLIC_WAYFORPAY_MERCHANT_DOMAIN;
  const secretKey = import.meta.env.WAYFORPAY_MERCHANT_SECRET_KEY;

  if (!merchantAccount || !merchantDomainName || !secretKey) {
    return new Response(
      JSON.stringify({ error: 'WayForPay is not configured. Set env vars.' }),
      { status: 500, headers: { 'content-type': 'application/json' } }
    );
  }

  const orderReference = `W100K-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orderDate = Math.floor(Date.now() / 1000);
  const amount = productPrice * productCount;

  const merchantSignature = buildSignature({
    merchantAccount,
    merchantDomainName,
    orderReference,
    orderDate,
    amount,
    currency,
    productNames: [productName],
    productCounts: [productCount],
    productPrices: [productPrice],
    secretKey,
  });

  const payload = {
    merchantAccount,
    merchantDomainName,
    merchantSignature,
    merchantAuthType: 'SimpleSignature',
    orderReference,
    orderDate,
    amount,
    currency,
    productName: [productName],
    productPrice: [productPrice],
    productCount: [productCount],
    clientEmail: body.clientEmail ?? '',
    clientPhone: body.clientPhone ?? '',
    language: 'UA',
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
};
