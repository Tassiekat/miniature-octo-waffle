import { createServerFn } from "@tanstack/react-start";
import { getRequestHost, getRequestUrl } from "@tanstack/react-start/server";

export type WebhookCheck = {
  name: string;
  description: string;
  expected: string;
  status: number | null;
  body: string;
  passed: boolean;
};

export type WebhookTestResult = {
  endpoint: string;
  eventId: string;
  eventType: string;
  secretConfigured: boolean;
  passed: boolean;
  summary: string;
  checks: WebhookCheck[];
  ranAt: string;
};

function resolveEndpoint(): string {
  try {
    const url = getRequestUrl();
    return `${url.protocol}//${url.host}/api/public/stripe/webhook`;
  } catch {
    const host = (() => {
      try {
        return getRequestHost();
      } catch {
        return null;
      }
    })();
    if (host) {
      const protocol = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
      return `${protocol}://${host}/api/public/stripe/webhook`;
    }
    const appUrl = (process.env["APP_URL"] || "https://gem-earn-hub.lovable.app").replace(/\/$/, "");
    return `${appUrl}/api/public/stripe/webhook`;
  }
}

async function post(endpoint: string, body: string, signature: string) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "stripe-signature": signature },
    body,
    cache: "no-store",
  });
  const text = (await res.text().catch(() => "")).slice(0, 500);
  return { status: res.status, body: text || "(empty response)" };
}

export type WebhookRunRecord = {
  id: string;
  ranAt: string;
  endpoint: string;
  eventId: string;
  eventType: string;
  passed: boolean;
  secretConfigured: boolean;
  checksPassed: number;
  checksFailed: number;
  summary: string;
  checks: WebhookCheck[];
};

async function recordRun(result: WebhookTestResult): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin as any).from("webhook_verification_runs").insert({
      ran_at: result.ranAt,
      endpoint: result.endpoint,
      event_id: result.eventId,
      event_type: result.eventType,
      secret_configured: result.secretConfigured,
      passed: result.passed,
      checks_passed: result.checks.filter((c) => c.passed).length,
      checks_failed: result.checks.filter((c) => !c.passed).length,
      summary: result.summary,
      checks: result.checks.map((c) => ({ ...c, body: c.body.slice(0, 300) })),
    });
    if (error) console.error("[Webhook test] history insert failed", error);
  } catch (error) {
    console.error("[Webhook test] history insert threw", error);
  }
}

export const listWebhookRuns = createServerFn({ method: "GET" }).handler(
  async (): Promise<WebhookRunRecord[]> => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data, error } = await (supabaseAdmin as any)
        .from("webhook_verification_runs")
        .select("*")
        .order("ran_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        id: String(row.id),
        ranAt: String(row.ran_at),
        endpoint: String(row.endpoint),
        eventId: String(row.event_id),
        eventType: String(row.event_type),
        passed: Boolean(row.passed),
        secretConfigured: Boolean(row.secret_configured),
        checksPassed: Number(row.checks_passed ?? 0),
        checksFailed: Number(row.checks_failed ?? 0),
        summary: String(row.summary ?? ""),
        checks: Array.isArray(row.checks) ? (row.checks as WebhookCheck[]) : [],
      }));
    } catch (error) {
      console.error("[Webhook test] history read failed", error);
      return [];
    }
  },
);

export const testStripeWebhook = createServerFn({ method: "POST" }).handler(
  async (): Promise<WebhookTestResult> => {
    const endpoint = resolveEndpoint();
    const secretConfigured = Boolean(process.env["STRIPE_WEBHOOK_SECRET"]?.trim());
    const ranAt = new Date().toISOString();
    const eventId = `evt_test_${Date.now().toString(36)}`;
    const eventType = "webhook.verification.test";

    if (!secretConfigured) {
      const unconfigured: WebhookTestResult = {
        endpoint,
        eventId,
        eventType,
        secretConfigured: false,
        passed: false,
        summary:
          "STRIPE_WEBHOOK_SECRET is not configured, so no test event can be signed. Add the signing secret from your Stripe dashboard first.",
        checks: [],
        ranAt,
      };
      await recordRun(unconfigured);
      return unconfigured;
    }

    const { signStripeWebhookPayload } = await import("@/lib/stripe.server");

    const payload = JSON.stringify({
      id: eventId,
      object: "event",
      type: eventType,
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      data: { object: { id: eventId, object: "test", metadata: { source: "telecash_test_verify" } } },
    });

    const checks: WebhookCheck[] = [];

    // 1. Correctly signed event must be accepted.
    const valid = await post(endpoint, payload, signStripeWebhookPayload(payload));
    checks.push({
      name: "Valid signature accepted",
      description: "Signed test event delivered to the live endpoint with a fresh HMAC signature.",
      expected: "HTTP 200",
      status: valid.status,
      body: valid.body,
      passed: valid.status === 200,
    });

    // 2. Tampered signature must be rejected.
    const tampered = await post(endpoint, payload, "t=" + Math.floor(Date.now() / 1000) + ",v1=" + "0".repeat(64));
    checks.push({
      name: "Forged signature rejected",
      description: "Same payload sent with an invalid v1 signature.",
      expected: "HTTP 401",
      status: tampered.status,
      body: tampered.body,
      passed: tampered.status === 401,
    });

    // 3. Replayed (stale timestamp) event must be rejected.
    const stale = Math.floor(Date.now() / 1000) - 3600;
    const replay = await post(endpoint, payload, signStripeWebhookPayload(payload, stale));
    checks.push({
      name: "Replayed event rejected",
      description: "Correctly signed payload with a 1-hour-old timestamp (outside the 5-minute tolerance).",
      expected: "HTTP 401",
      status: replay.status,
      body: replay.body,
      passed: replay.status === 401,
    });

    // 4. Missing signature header must be rejected.
    const missing = await post(endpoint, payload, "");
    checks.push({
      name: "Missing signature rejected",
      description: "Payload sent with no stripe-signature header at all.",
      expected: "HTTP 401",
      status: missing.status,
      body: missing.body,
      passed: missing.status === 401,
    });

    const passed = checks.every((c) => c.passed);
    const failing = checks.filter((c) => !c.passed);

    const result: WebhookTestResult = {
      endpoint,
      eventId,
      eventType,
      secretConfigured: true,
      passed,
      summary: passed
        ? "Verification passed: the endpoint accepted the signed test event and rejected forged, replayed, and unsigned deliveries."
        : `Verification failed on ${failing.length} check${failing.length === 1 ? "" : "s"}: ${failing
            .map((c) => `${c.name} returned HTTP ${c.status ?? "no response"}`)
            .join("; ")}.`,
      checks,
      ranAt,
    };

    await recordRun(result);
    return result;
  },
);
