import { createServerFn } from "@tanstack/react-start";

export type FieldStatus = {
  key: string;
  label: string;
  required: boolean;
  present: boolean;
  hint: string;
};

export type StripeStatus = {
  connected: boolean;
  mode: "test" | "live" | "unknown";
  accountLabel: string | null;
  message: string;
  fields: FieldStatus[];
  webhook: {
    endpoint: string;
    secretConfigured: boolean;
    verification: "ok" | "unverified" | "failing";
    detail: string;
  };
  checkedAt: string;
};

function maskPresence(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

export const getStripeStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<StripeStatus> => {
    const secret = process.env["STRIPE_SECRET_KEY"];
    const publishable =
      process.env["STRIPE_PUBLISHABLE_KEY"] ?? process.env["VITE_STRIPE_PUBLISHABLE_KEY"];
    const webhookSecret = process.env["STRIPE_WEBHOOK_SECRET"];
    const appUrl = (process.env["APP_URL"] || "https://gem-earn-hub.lovable.app").replace(/\/$/, "");

    const fields: FieldStatus[] = [
      {
        key: "STRIPE_SECRET_KEY",
        label: "Secret key",
        required: true,
        present: maskPresence(secret),
        hint: "Server-side key used to create checkout sessions.",
      },
      {
        key: "STRIPE_PUBLISHABLE_KEY",
        label: "Publishable key",
        required: true,
        present: maskPresence(publishable),
        hint: "Safe to expose in the browser; used by Stripe.js.",
      },
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Webhook signing secret",
        required: true,
        present: maskPresence(webhookSecret),
        hint: "Verifies that incoming events really came from Stripe.",
      },
    ];

    let connected = false;
    let mode: StripeStatus["mode"] = "unknown";
    let accountLabel: string | null = null;
    let message = "Stripe is not connected yet. Add the required keys to start accepting payments.";

    if (maskPresence(secret)) {
      mode = secret!.startsWith("sk_live") ? "live" : "test";
      try {
        const res = await fetch("https://api.stripe.com/v1/account", {
          headers: { Authorization: `Bearer ${secret}` },
        });
        const data: any = await res.json().catch(() => ({}));
        if (res.ok) {
          connected = true;
          accountLabel = data?.settings?.dashboard?.display_name ?? data?.id ?? null;
          message = `Connected to Stripe in ${mode} mode.`;
        } else {
          message = data?.error?.message
            ? `Stripe rejected the key: ${data.error.message}`
            : `Stripe returned HTTP ${res.status}.`;
        }
      } catch {
        message = "Could not reach Stripe. Check network access and try again.";
      }
    }

    const webhookSecretConfigured = maskPresence(webhookSecret);
    const verification: StripeStatus["webhook"]["verification"] = !webhookSecretConfigured
      ? "unverified"
      : connected
        ? "ok"
        : "failing";

    return {
      connected,
      mode,
      accountLabel,
      message,
      fields,
      webhook: {
        endpoint: `${appUrl}/api/public/stripe/webhook`,
        secretConfigured: webhookSecretConfigured,
        verification,
        detail: !webhookSecretConfigured
          ? "No signing secret stored — incoming events cannot be verified and will be rejected."
          : connected
            ? "Signature verification is configured and the account key is valid."
            : "Signing secret is stored but the Stripe account key is missing or invalid.",
      },
      checkedAt: new Date().toISOString(),
    };
  },
);
