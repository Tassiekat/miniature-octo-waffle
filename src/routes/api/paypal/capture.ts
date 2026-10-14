import { createFileRoute } from "@tanstack/react-router";
import { capturePayPalOrder, isPayPalProductSlug, PAYPAL_PRODUCTS } from "@/lib/paypal.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const DEFAULT_APP_URL = "https://gen-earn-hub.vercel.app";

function appOrigin(request: Request): string {
  return (process.env.APP_URL?.trim() || DEFAULT_APP_URL || new URL(request.url).origin).replace(/\/$/, "");
}

export const Route = createFileRoute("/api/paypal/capture")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = appOrigin(request);
        const url = new URL(request.url);
        const orderId = url.searchParams.get("token")?.trim();

        if (!orderId) {
          return Response.redirect(`${origin}/checkout?payment_error=missing_order`, 303);
        }

        try {
          const order = await capturePayPalOrder(orderId);
          const purchaseUnit = order?.purchase_units?.[0];
          const capture = purchaseUnit?.payments?.captures?.[0];
          const product = purchaseUnit?.reference_id;
          const customId = purchaseUnit?.custom_id;
          const [userId, customProduct] =
            typeof customId === "string" ? customId.split("|", 2) : ["", ""];

          if (
            order?.status !== "COMPLETED" ||
            capture?.status !== "COMPLETED" ||
            !isPayPalProductSlug(product) ||
            customProduct !== product ||
            !userId
          ) {
            console.error("[PayPal] completed order failed verification", {
              orderId,
              orderStatus: order?.status,
              captureStatus: capture?.status,
              product,
              customProduct,
              userIdPresent: Boolean(userId),
            });
            return Response.redirect(`${origin}/checkout?payment_error=verification`, 303);
          }

          const expected = PAYPAL_PRODUCTS[product];
          if (
            capture?.amount?.currency_code !== "AUD" ||
            capture?.amount?.value !== expected.amount
          ) {
            console.error("[PayPal] completed order amount mismatch", {
              orderId,
              product,
              amount: capture?.amount,
            });
            return Response.redirect(`${origin}/checkout?payment_error=amount`, 303);
          }

          const db = supabaseAdmin as any;
          const { error } = await db.from("vault_entitlements").upsert(
            {
              user_id: userId,
              product_slug: product,
              payment_provider: "paypal",
              provider_order_id: orderId,
              provider_capture_id: String(capture.id),
              stripe_checkout_session_id: null,
              stripe_payment_intent_id: null,
              status: "active",
            },
            { onConflict: "user_id,product_slug" },
          );

          if (error) {
            console.error("[PayPal] entitlement persistence failed", error);
            return Response.redirect(`${origin}/checkout?product=${encodeURIComponent(product)}&payment_error=access`, 303);
          }

          return Response.redirect(
            `${origin}/success?provider=paypal&product=${encodeURIComponent(product)}`,
            303,
          );
        } catch (error) {
          console.error("[PayPal] capture failed", error);
          return Response.redirect(`${origin}/checkout?payment_error=capture`, 303);
        }
      },
    },
  },
});
