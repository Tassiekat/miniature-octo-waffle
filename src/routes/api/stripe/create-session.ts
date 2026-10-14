import { createFileRoute } from "@tanstack/react-router";
import { createStripeCheckout, type StripePlanKey } from "@/lib/stripe.server";

const VALID_PLANS: StripePlanKey[] = ["basic", "pro", "vip"];

function isPlan(value: unknown): value is StripePlanKey {
  return typeof value === "string" && VALID_PLANS.includes(value as StripePlanKey);
}

function getBaseUrl(request: Request): string {
  return (process.env.APP_URL?.trim() || new URL(request.url).origin).replace(/\/$/, "");
}

export const Route = createFileRoute("/api/stripe/create-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => null);
          if (!isPlan(body?.plan)) return Response.json({ error: "Invalid plan" }, { status: 400 });

          const baseUrl = getBaseUrl(request);
          const orderId = `stripe_order_${crypto.randomUUID()}`;
          const checkout = await createStripeCheckout({
            plan: body.plan,
            successUrl: `${baseUrl}/checkout/complete?provider=stripe&session_id={CHECKOUT_SESSION_ID}`,
            cancelUrl: `${baseUrl}/checkout?provider=stripe&cancelled=1`,
            metadata: { order_id: orderId, source: "gen-earn-hub", plan_key: body.plan },
          });

          return Response.json({ orderId, sessionId: checkout.id, purchaseUrl: checkout.url });
        } catch (error) {
          console.error("[Stripe] create-session failed", error);
          return Response.json({ error: "Stripe checkout is temporarily unavailable" }, { status: 503 });
        }
      },
    },
  },
});
