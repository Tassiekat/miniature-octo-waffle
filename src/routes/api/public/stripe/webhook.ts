import { createFileRoute } from "@tanstack/react-router";
import { verifyStripeWebhook } from "@/lib/stripe.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function text(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

const PAID_EVENTS = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const FAILED_EVENTS = new Set([
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature") || "";

        try {
          if (!verifyStripeWebhook(rawBody, signature)) {
            return new Response("Invalid signature", { status: 401 });
          }
        } catch (error) {
          console.error("[Stripe webhook] verification setup failed", error);
          return new Response("Webhook not configured", { status: 500 });
        }

        let event: any;
        try {
          event = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const eventId = text(event?.id);
        const eventType = text(event?.type);
        if (!eventId || !eventType) {
          return new Response("Invalid webhook event", { status: 400 });
        }

        const db = supabaseAdmin as any;
        const { data: processed } = await db
          .from("stripe_webhook_events")
          .select("id")
          .eq("id", eventId)
          .maybeSingle();
        if (processed) return new Response("OK", { status: 200 });

        const object = event?.data?.object ?? {};
        const metadata = object?.metadata ?? {};
        const paymentIntentId = text(object?.payment_intent);
        const isCheckoutEvent = eventType.startsWith("checkout.session.");
        const paymentId = paymentIntentId || text(object?.id) || eventId;
        const paid = PAID_EVENTS.has(eventType) && object?.payment_status === "paid";
        const status = paid
          ? "succeeded"
          : FAILED_EVENTS.has(eventType)
            ? "failed"
            : eventType === "checkout.session.completed"
              ? "pending"
              : null;

        if (status) {
          const { error: paymentError } = await db.from("stripe_payments").upsert(
            {
              payment_id: paymentId,
              event_id: eventId,
              checkout_session_id: isCheckoutEvent ? text(object?.id) : null,
              order_id: text(metadata?.order_id),
              plan_key: text(metadata?.product) || text(metadata?.plan_key),
              status,
              amount:
                typeof object?.amount_total === "number"
                  ? object.amount_total
                  : typeof object?.amount === "number"
                    ? object.amount
                    : null,
              currency: text(object?.currency),
              customer_id: text(object?.customer),
              metadata,
              event_type: eventType,
              occurred_at:
                typeof event?.created === "number"
                  ? new Date(event.created * 1000).toISOString()
                  : null,
            },
            { onConflict: "payment_id" },
          );

          if (paymentError) {
            console.error("[Stripe webhook] payment persistence failed", paymentError);
            return new Response("Retry", { status: 500 });
          }
        }

        if (paid) {
          const userId = text(metadata?.app_user_id) || text(object?.client_reference_id);
          const product = text(metadata?.product);
          const sessionId = text(object?.id);

          if (!userId || !product || !sessionId) {
            console.error("[Stripe webhook] paid checkout is missing entitlement metadata", {
              eventId,
              userIdPresent: Boolean(userId),
              product,
              sessionId,
            });
            return new Response("Retry", { status: 500 });
          }

          const { error: entitlementError } = await db.from("vault_entitlements").upsert(
            {
              user_id: userId,
              product_slug: product,
              stripe_checkout_session_id: sessionId,
              stripe_payment_intent_id: paymentIntentId,
              status: "active",
            },
            { onConflict: "user_id,product_slug" },
          );

          if (entitlementError) {
            console.error("[Stripe webhook] entitlement persistence failed", entitlementError);
            return new Response("Retry", { status: 500 });
          }
        }

        if (eventType === "charge.refunded" || eventType === "charge.dispute.created") {
          const refundedPaymentIntent = text(object?.payment_intent);
          if (refundedPaymentIntent) {
            const { error: revokeError } = await db
              .from("vault_entitlements")
              .update({ status: "revoked" })
              .eq("stripe_payment_intent_id", refundedPaymentIntent);

            if (revokeError) {
              console.error("[Stripe webhook] entitlement revocation failed", revokeError);
              return new Response("Retry", { status: 500 });
            }
          }
        }

        const { error: eventError } = await db.from("stripe_webhook_events").insert({
          id: eventId,
          event_type: eventType,
          payload: event,
        });
        if (eventError && eventError.code !== "23505") {
          console.error("[Stripe webhook] event persistence failed", eventError);
          return new Response("Retry", { status: 500 });
        }

        return new Response("OK", { status: 200 });
      },
    },
  },
});
