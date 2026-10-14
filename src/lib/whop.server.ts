import { createHmac } from "node:crypto";

const WHOP_API_BASE = process.env.WHOP_API_BASE_URL?.replace(/\/$/, "") || "https://api.whop.com/api/v1";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export type WhopPlanKey = "basic" | "pro" | "vip";

export const WHOP_PLANS: Record<WhopPlanKey, { name: string; env: string }> = {
  basic: { name: "Basic", env: "WHOP_PLAN_BASIC" },
  pro: { name: "Pro", env: "WHOP_PLAN_PRO" },
  vip: { name: "VIP", env: "WHOP_PLAN_VIP" },
};

export function getWhopPlanId(plan: WhopPlanKey): string {
  return requireEnv(WHOP_PLANS[plan].env);
}

export async function getWhopLedgerSchema() {
  const url = new URL(`${WHOP_API_BASE}/stats/schema`);
  url.searchParams.set("resource_type", "wallet");

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "Api-Version-Date": process.env.WHOP_API_VERSION_DATE || "2026-06-09",
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    console.error("[Whop] ledger schema request failed", response.status, payload);
    throw new Error("Unable to load Whop ledger schema");
  }

  return payload;
}

export async function createWhopCheckout(options: {
  planId: string;
  metadata: Record<string, string>;
  redirectUrl: string;
}) {
  const apiKey = requireEnv("WHOP_API_KEY");
  const planId = options.planId.trim();
  if (!planId) throw new Error("Missing Whop plan ID");

  const response = await fetch(`${WHOP_API_BASE}/checkout_configurations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Api-Version-Date": process.env.WHOP_API_VERSION_DATE || "2026-06-09",
    },
    body: JSON.stringify({
      plan_id: planId,
      mode: "payment",
      redirect_url: options.redirectUrl,
      metadata: options.metadata,
    }),
    cache: "no-store",
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    console.error("[Whop] checkout configuration failed", response.status, payload);
    throw new Error("Unable to create Whop checkout");
  }

  if (!payload?.id || !payload?.purchase_url) {
    console.error("[Whop] invalid checkout configuration response", payload);
    throw new Error("Whop returned an invalid checkout configuration");
  }

  return {
    id: String(payload.id),
    purchaseUrl: String(payload.purchase_url),
    planId: String(payload.plan?.id || planId),
  };
}

function timingSafeEqualText(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export function verifyWhopWebhook(rawBody: string, headers: Headers): boolean {
  const configuredSecret = requireEnv("WHOP_WEBHOOK_SECRET");
  const secret = configuredSecret.startsWith("whsec_") ? configuredSecret.slice(6) : configuredSecret;
  const webhookId = headers.get("webhook-id") || "";
  const timestamp = headers.get("webhook-timestamp") || "";
  const signatureHeader = headers.get("webhook-signature") || "";

  if (!webhookId || !timestamp || !signatureHeader) return false;

  const timestampNumber = Number(timestamp);
  if (!Number.isFinite(timestampNumber)) return false;
  if (Math.abs(Date.now() / 1000 - timestampNumber) > 300) return false;

  let key: Buffer;
  try {
    key = Buffer.from(secret, "base64");
  } catch {
    return false;
  }
  if (!key.length) return false;

  const signedContent = `${webhookId}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", key).update(signedContent).digest("base64");
  const signatures = signatureHeader
    .split(" ")
    .map((part) => part.split(","))
    .filter((parts) => parts.length === 2 && parts[0] === "v1")
    .map((parts) => parts[1]);

  return signatures.some((signature) => timingSafeEqualText(signature, expected));
}
