import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function bearer(request: Request): string | null {
  const value = request.headers.get("authorization");
  return value?.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

export const Route = createFileRoute("/api/access")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = bearer(request);
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!token || !url || !key) return Response.json({ authenticated: false, active: false }, { status: 401 });

        const authClient = createClient(url, key, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data, error } = await authClient.auth.getUser(token);
        if (error || !data.user) return Response.json({ authenticated: false, active: false }, { status: 401 });

        const db = supabaseAdmin as any;
        const { data: membership, error: membershipError } = await db
          .from("membership_entitlements")
          .select("provider,membership_id,plan_id,tier,status,activated_at,updated_at")
          .eq("user_id", data.user.id)
          .maybeSingle();

        if (membershipError) {
          console.error("[access] membership lookup failed", membershipError);
          return Response.json({ authenticated: true, active: false, error: "Membership status unavailable" }, { status: 503 });
        }

        return Response.json({
          authenticated: true,
          active: membership?.status === "active",
          membership: membership ?? null,
        });
      },
    },
  },
});
