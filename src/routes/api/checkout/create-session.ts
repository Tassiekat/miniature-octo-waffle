import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createWhopCheckout, getWhopPlanId, type WhopPlanKey } from "@/lib/whop.server";

function getBaseUrl(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return new URL(request.url).origin;
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

function isWhopPlanKey(value: unknown): value is WhopPlanKey {
  return value === "basic" || value === "pro" || value === "vip";
}

export const Route = createFileRoute("/api/checkout/create-session")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const token = getBearerToken(request);
          if (!token) return Response.json({ error: "Sign in before checkout" }, { status: 401 });

          const body = await request.json().catch(() => null);
          if (!isWhopPlanKey(body?.plan)) {
            return Response.json({ error: "Choose a valid checkout plan" }, { status: 400 });
          }
          const plan = body.plan;

          const supabaseUrl = process.env.SUPABASE_URL;
          const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
          if (!supabaseUrl || !publishableKey) {
            return Response.json({ error: "Authentication is temporarily unavailable" }, { status: 503 });
          }

          const authClient = createClient(supabaseUrl, publishableKey, {
            global: { headers: { Authorization: `Bearer ${token}` } },
            auth: { persistSession: false, autoRefreshToken: false },
          });
          const { data, error: authError } = await authClient.auth.getUser(token);
          if (authError || !data.user) return Response.json({ error: "Your session has expired" }, { status: 401 });

          const baseUrl = getBaseUrl(request);
          const orderId = `order_${crypto.randomUUID()}`;
          const checkout = await createWhopCheckout({
            planId: getWhopPlanId(plan),
            metadata: {
              order_id: orderId,
              source: "gen-earn-hub",
              plan_key: plan,
              app_user_id: data.user.id,
              app_user_email: data.user.email ?? "",
            },
            redirectUrl: `${baseUrl}/checkout/complete?order_id=${encodeURIComponent(orderId)}&status=success`,
          });

          return Response.json({
            orderId,
            checkoutConfigId: checkout.id,
            planId: checkout.planId,
            purchaseUrl: checkout.purchaseUrl,
          });
        } catch (error) {
          console.error("[checkout] create-session failed", error);
          return Response.json({ error: "Checkout is temporarily unavailable" }, { status: 503 });
        }
      },
    },
  },
});
