import { useEffect, useState } from "react";
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Plan = "basic" | "pro" | "vip";
const WHOP_PLAN_ID = "plan_5DHat0xXWJGtK";

const PLAN_LABELS: Record<Plan, string> = {
  basic: "Basic",
  pro: "Pro",
  vip: "VIP",
};

export function WhopCheckout({ plan = "pro" }: { plan?: Plan }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function startCheckout() {
      try {
        const { data } = await supabase.auth.getSession();
        const session = data.session;
        if (!session) {
          window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        const response = await fetch("/api/checkout/create-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ plan }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.purchaseUrl) {
          throw new Error(payload?.error || "Unable to create secure checkout");
        }

        if (!cancelled) window.location.assign(payload.purchaseUrl);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unable to load Whop checkout");
          setLoading(false);
        }
      }
    }

    void startCheckout();
    return () => { cancelled = true; };
  }, [plan]);

  if (loading && !error) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-border bg-[#caf6ff]">
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-[#3358d4]" />
          <p className="mt-3 text-sm font-medium">Preparing secure Whop checkout…</p>
          <p className="mt-1 text-xs text-muted-foreground">Your account will be linked automatically after payment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border bg-[#caf6ff] px-5 py-4">
        <p className="font-semibold">{PLAN_LABELS[plan]} checkout</p>
        <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          Secure payment powered by Whop
        </div>
      </div>
      <div className="p-6">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-[#3358d4] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Try checkout again <ExternalLink className="h-4 w-4" />
        </button>
        <p className="mt-4 text-xs text-muted-foreground">Whop plan: {WHOP_PLAN_ID}</p>
      </div>
    </div>
  );
}
