// Client-side WayForPay widget launcher.
// Flow: ask /api/wayforpay/signature for a signed payload, then run the widget.
// Real merchant credentials are read from env vars on the server — this file
// only handles UX (loading the widget script, opening the modal).

declare global {
  interface Window {
    Wayforpay?: new () => {
      run: (
        request: Record<string, unknown>,
        approved: (resp: unknown) => void,
        declined: (resp: unknown) => void,
        pending: (resp: unknown) => void
      ) => void;
    };
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

const WIDGET_SRC = 'https://secure.wayforpay.com/server/pay-widget.js';

let widgetPromise: Promise<void> | null = null;

function loadWidget(): Promise<void> {
  if (widgetPromise) return widgetPromise;

  widgetPromise = new Promise((resolve, reject) => {
    if (window.Wayforpay) return resolve();

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WIDGET_SRC}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('widget load failed')), {
        once: true,
      });
      return;
    }

    const s = document.createElement('script');
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('widget load failed'));
    document.head.appendChild(s);
  });

  return widgetPromise;
}

export interface PaymentRequest {
  planId: string;
  productName: string;
  productPrice: number;
  currency: string;
  clientEmail?: string;
  clientPhone?: string;
}

export async function startPayment(req: PaymentRequest): Promise<void> {
  trackBeginCheckout(req);

  let signed: Record<string, unknown>;
  try {
    const res = await fetch('/api/wayforpay/signature', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        productName: req.productName,
        productPrice: req.productPrice,
        productCount: 1,
        currency: req.currency,
        clientEmail: req.clientEmail,
        clientPhone: req.clientPhone,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
    }

    signed = await res.json();
  } catch (err) {
    console.error('[wayforpay] signature error', err);
    alert(
      'Не вдалося підготувати оплату. Спробуй ще раз або напиши нам у підтримку.'
    );
    return;
  }

  try {
    await loadWidget();
  } catch (err) {
    console.error('[wayforpay] widget load error', err);
    alert('Не вдалося завантажити форму оплати. Перевір з’єднання з інтернетом.');
    return;
  }

  if (!window.Wayforpay) {
    alert('Платіжна форма недоступна. Спробуй пізніше.');
    return;
  }

  const widget = new window.Wayforpay();

  widget.run(
    signed,
    (resp) => {
      trackPurchase(req, resp);
      window.location.href = `/thank-you?order=${encodeURIComponent(
        String((resp as { orderReference?: string })?.orderReference ?? '')
      )}`;
    },
    (resp) => {
      console.warn('[wayforpay] declined', resp);
      alert('Платіж відхилено. Спробуй іншу картку або зв’яжись із підтримкою.');
    },
    (resp) => {
      console.info('[wayforpay] pending', resp);
    }
  );
}

function trackBeginCheckout(req: PaymentRequest) {
  try {
    window.gtag?.('event', 'begin_checkout', {
      currency: req.currency,
      value: req.productPrice,
      items: [{ item_id: req.planId, item_name: req.productName, price: req.productPrice }],
    });
    window.fbq?.('track', 'InitiateCheckout', {
      currency: req.currency,
      value: req.productPrice,
      content_ids: [req.planId],
      content_name: req.productName,
    });
  } catch {
    // analytics is best-effort; never block checkout
  }
}

function trackPurchase(req: PaymentRequest, _resp: unknown) {
  try {
    window.gtag?.('event', 'purchase', {
      currency: req.currency,
      value: req.productPrice,
      transaction_id: String((_resp as { orderReference?: string })?.orderReference ?? ''),
      items: [{ item_id: req.planId, item_name: req.productName, price: req.productPrice }],
    });
    window.fbq?.('track', 'Purchase', {
      currency: req.currency,
      value: req.productPrice,
      content_ids: [req.planId],
      content_name: req.productName,
    });
  } catch {
    // best-effort
  }
}
