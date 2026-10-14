import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createPayPalOrder, isPayPalProductSlug } from "@/lib/paypal.server";

const DEFAULT_SUPABASE_URL = "https://annkrblalwfefhyifgzq.supabase.co";
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_276rx0e35ICh3xwa7MZ2bw_0IcU94iQ";
const DEFAULT_APP_URL = "https://gen-earn-hub.vercel.app";

function bearer(request: Request): string | null {
  const header = request.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

export const Route = createFileRoute("/api/create-checkout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl = process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

        if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
          return Response.json(
            { error: "PayPal checkout is temporarily unavailable." },
            { status: 503 },
          );
        }

        const token = bearer(request);
        if (!token) {
          return Response.json({ error: "Sign in before checkout." }, { status: 401 });
        }

        const authClient = createClient(supabaseUrl, publishableKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: authData, error: authError } = await authClient.auth.getUser(token);
        if (authError || !authData.user) {
          return Response.json(
            { error: "Your session has expired. Please sign in again." },
            { status: 401 },
          );
        }

        const body = (await request.json().catch(() => null)) as {
          product?: unknown;
        } | null;
        if (!isPayPalProductSlug(body?.product)) {
          return Response.json(
            { error: "That product is not configured for checkout." },
            { status: 400 },
          );
        }
        const product = body.product;

        const origin = (
          process.env.APP_URL?.trim() ||
          DEFAULT_APP_URL ||
          new URL(request.url).origin
        ).replace(/\/$/, "");

        try {
          const order = await createPayPalOrder({
            product,
            userId: authData.user.id,
            returnUrl: `${origin}/api/paypal/capture`,
            cancelUrl: `${origin}/checkout?product=${encodeURIComponent(product)}&cancelled=1`,
          });

          return Response.json({ url: order.approvalUrl, orderId: order.id });
        } catch (error) {
          console.error("[PayPal] order creation failed", error);
          return Response.json(
            { error: "PayPal could not start checkout. Please try again." },
            { status: 502 },
          );
        }
      },
    },
  },
});
