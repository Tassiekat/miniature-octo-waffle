import { createHmac } from "node:crypto";

export type StripePlanKey = "basic" | "pro" | "vip";

const PLANS: Record<StripePlanKey, string> = {
  basic: "STRIPE_PRICE_BASIC",
  pro: "STRIPE_PRICE_PRO",
  vip: "STRIPE_PRICE_VIP",
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getStripePriceId(plan: StripePlanKey): string {
  return requireEnv(PLANS[plan]);
}

export function getStripeMode(): "payment" | "subscription" {
  return process.env.STRIPE_CHECKOUT_MODE === "subscription" ? "subscription" : "payment";
}

function formEncode(values: Record<string, string>): string {
  return new URLSearchParams(values).toString();
}

export async function createStripeCheckout(options: {
  plan: StripePlanKey;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
}) {
  const secret = requireEnv("STRIPE_SECRET_KEY");
  const mode = getStripeMode();
  const params: Record<string, string> = {
    mode,
    "line_items[0][price]": getStripePriceId(options.plan),
    "line_items[0][quantity]": "1",
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
  };

  for (const [key, value] of Object.entries(options.metadata)) {
    params[`metadata[${key}]`] = value;
  }

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formEncode(params),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.id || !payload?.url) {
    console.error("[Stripe] checkout creation failed", response.status, payload);
    throw new Error("Unable to create Stripe checkout");
  }

  return { id: String(payload.id), url: String(payload.url) };
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string): boolean {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const parts = signatureHeader.split(",");
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts.filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  if (!timestampPart || signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signatures.some((signature) => timingSafeEqualText(signature, expected));
}

export function signStripeWebhookPayload(
  rawBody: string,
  timestampSeconds = Math.floor(Date.now() / 1000),
): string {
  const secret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const signature = createHmac("sha256", secret)
    .update(`${timestampSeconds}.${rawBody}`)
    .digest("hex");
  return `t=${timestampSeconds},v1=${signature}`;
}
