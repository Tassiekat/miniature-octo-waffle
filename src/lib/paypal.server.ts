type Product = {
  name: string;
  amount: string;
};

export const PAYPAL_PRODUCTS = {
  "ai-side-hustle-kit-2026": {
    name: "AI Side Hustle Kit 2026",
    amount: "19.00",
  },
  "creator-blueprint": {
    name: "Creator Blueprint",
    amount: "12.00",
  },
  "digital-income-planner": {
    name: "Digital Income Planner",
    amount: "9.00",
  },
} satisfies Record<string, Product>;

export type PayPalProductSlug = keyof typeof PAYPAL_PRODUCTS;

export function isPayPalProductSlug(value: unknown): value is PayPalProductSlug {
  return typeof value === "string" && value in PAYPAL_PRODUCTS;
}

function apiBase(): string {
  return process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function accessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured");
  }

  const response = await fetch(`${apiBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.access_token) {
    console.error("[PayPal] OAuth failed", response.status, payload);
    throw new Error("PayPal authentication failed");
  }
  return String(payload.access_token);
}

async function paypalRequest(path: string, init: RequestInit): Promise<any> {
  const token = await accessToken();
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": crypto.randomUUID(),
      ...(init.headers || {}),
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload) {
    console.error("[PayPal] API request failed", path, response.status, payload);
    throw new Error("PayPal could not complete the request");
  }
  return payload;
}

export async function createPayPalOrder(options: {
  product: PayPalProductSlug;
  userId: string;
  returnUrl: string;
  cancelUrl: string;
}) {
  const offer = PAYPAL_PRODUCTS[options.product];
  const payload = await paypalRequest("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: options.product,
          custom_id: `${options.userId}|${options.product}`,
          description: offer.name,
          amount: {
            currency_code: "AUD",
            value: offer.amount,
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            brand_name: "Gen Earn Hub",
            shipping_preference: "NO_SHIPPING",
            user_action: "PAY_NOW",
            return_url: options.returnUrl,
            cancel_url: options.cancelUrl,
          },
        },
      },
    }),
  });

  const approvalUrl = payload.links?.find(
    (link: any) => link?.rel === "payer-action" || link?.rel === "approve",
  )?.href;
  if (!payload.id || !approvalUrl) {
    console.error("[PayPal] create order returned no approval URL", payload);
    throw new Error("PayPal returned an invalid checkout response");
  }

  return { id: String(payload.id), approvalUrl: String(approvalUrl) };
}

export async function capturePayPalOrder(orderId: string): Promise<any> {
  const path = `/v2/checkout/orders/${encodeURIComponent(orderId)}`;
  try {
    return await paypalRequest(`${path}/capture`, {
      method: "POST",
      body: "{}",
    });
  } catch (captureError) {
    const existing = await paypalRequest(path, { method: "GET" });
    if (existing?.status === "COMPLETED") return existing;
    throw captureError;
  }
}
