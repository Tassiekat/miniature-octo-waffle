import { createFileRoute } from "@tanstack/react-router";
import { verifyWhopWebhook } from "@/lib/whop.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const FIXED_PRO_PLAN_ID = "plan_5DHat0xXWJGtK";

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function tierFrom(planKey: unknown, planId: unknown): "basic" | "pro" | "vip" | null {
  if (planKey === "basic" || planKey === "pro" || planKey === "vip") return planKey;
  const id = stringValue(planId);
  if (!id) return null;
  if (id === FIXED_PRO_PLAN_ID || id === process.env.WHOP_PLAN_PRO) return "pro";
  if (id === process.env.WHOP_PLAN_BASIC) return "basic";
  if (id === process.env.WHOP_PLAN_VIP) return "vip";
  return null;
}

export const Route = createFileRoute("/api/webhooks/whop")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawBody = await request.text();
        let verified = false;
        try {
          verified = verifyWhopWebhook(rawBody, request.headers);
        } catch (error) {
          console.error("[Whop webhook] verification setup failed", error);
          return new Response("Webhook not configured", { status: 500 });
        }
        if (!verified) return new Response("Invalid signature", { status: 401 });

        let event: any;
        try { event = JSON.parse(rawBody); } catch { return new Response("Invalid JSON", { status: 400 }); }

        const eventId = stringValue(request.headers.get("webhook-id")) || stringValue(event?.id);
        const eventType = stringValue(event?.type);
        if (!eventId || !eventType) return new Response("Invalid webhook event", { status: 400 });

        const db = supabaseAdmin as any;
        const { data: existingEvent } = await db.from("whop_webhook_events").select("id").eq("id", eventId).maybeSingle();
        if (existingEvent) return new Response("OK", { status: 200 });

        const data = event.data ?? {};
        const metadata = data.metadata ?? {};
        const appUserId = stringValue(metadata.app_user_id);
        const planId = stringValue(data.plan?.id) || stringValue(data.plan_id);
        const tier = tierFrom(metadata.plan_key, planId);

        if (eventType === "payment.succeeded" || eventType === "payment.failed" || eventType === "payment.pending") {
          const paymentId = stringValue(data.id) ?? eventId;
          const status = eventType === "payment.succeeded" ? "succeeded" : eventType === "payment.failed" ? "failed" : "pending";
          const { error } = await db.from("whop_payments").upsert({
            payment_id: paymentId,
            event_id: eventId,
            order_id: stringValue(metadata.order_id),
            plan_id: planId,
            member_id: stringValue(data.member?.id),
            user_id: appUserId,
            status,
            amount: typeof data.amount === "number" ? data.amount : null,
            amount_after_fees: typeof data.amount_after_fees === "number" ? data.amount_after_fees : null,
            currency: stringValue(data.currency),
            metadata,
            paid_at: stringValue(data.paid_at),
          }, { onConflict: "payment_id" });
          if (error) {
            console.error("[Whop webhook] payment persistence failed", error);
            return new Response("Retry", { status: 500 });
          }

          if (eventType === "payment.succeeded" && appUserId && tier) {
            const { error: entitlementError } = await db.from("membership_entitlements").upsert({
              user_id: appUserId,
              provider: "whop",
              membership_id: stringValue(data.member?.id),
              plan_id: planId,
              tier,
              status: "active",
              source_payment_id: paymentId,
              metadata,
              activated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            if (entitlementError) {
              console.error("[Whop webhook] entitlement persistence failed", entitlementError);
              return new Response("Retry", { status: 500 });
            }
          }
        }

        if (eventType === "membership.activated" || eventType === "membership.deactivated") {
          const membershipId = stringValue(data.id);
          let userId = appUserId;
          if (!userId && membershipId) {
            const { data: existingMembership } = await db.from("membership_entitlements").select("user_id").eq("membership_id", membershipId).maybeSingle();
            userId = stringValue(existingMembership?.user_id);
          }
          if (userId && tier) {
            const { error } = await db.from("membership_entitlements").upsert({
              user_id: userId,
              provider: "whop",
              membership_id: membershipId,
              plan_id: planId,
              tier,
              status: eventType === "membership.activated" ? "active" : "inactive",
              metadata,
              activated_at: eventType === "membership.activated" ? new Date().toISOString() : undefined,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" });
            if (error) {
              console.error("[Whop webhook] membership persistence failed", error);
              return new Response("Retry", { status: 500 });
            }
          }
        }

        const { error: insertError } = await db.from("whop_webhook_events").insert({ id: eventId, event_type: eventType, payload: event });
        if (insertError && insertError.code !== "23505") {
          console.error("[Whop webhook] event persistence failed", insertError);
          return new Response("Retry", { status: 500 });
        }
        return new Response("OK", { status: 200 });
      },
    },
  },
});
