import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, LockKeyhole, LogOut, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Entitlement = { product_slug: string; status: string };
const products: Record<string, { name: string; description: string }> = {
  "ai-side-hustle-kit-2026": {
    name: "AI Side Hustle Kit 2026",
    description: "Your practical AI side-hustle starter system.",
  },
  "creator-blueprint": {
    name: "Creator Blueprint",
    description: "Your creator content and income framework.",
  },
  "digital-income-planner": {
    name: "Digital Income Planner",
    description: "Your focused digital product and revenue planner.",
  },
};

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ href: "/auth?next=/dashboard" });
  },
  component: Dashboard,
});

function Dashboard() {
  const [email, setEmail] = useState("");
  const [entitlements, setEntitlements] = useState<Entitlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      window.location.href = "/auth?next=/dashboard";
      return;
    }
    setEmail(userData.user.email ?? "");
    const { data, error: queryError } = await (supabase as any)
      .from("vault_entitlements")
      .select("product_slug,status")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    setEntitlements(data ?? []);
    setError(queryError?.message ?? null);
    setLoading(false);
  }

  async function downloadProduct(productSlug: string) {
    setDownloading(productSlug);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        window.location.href = "/auth?next=/dashboard";
        return;
      }

      const response = await fetch(
        `/api/download?product=${encodeURIComponent(productSlug)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Download unavailable.");
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const filename =
        disposition.match(/filename="([^"]+)"/)?.[1] || `${productSlug}.pdf`;
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Download unavailable.");
    } finally {
      setDownloading(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#241b1a]">
      <header className="border-b border-[#eadfd9] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#241b1a] text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif font-black">Gen Earn Hub</div>
              <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#b66f5a]">
                Member vault
              </div>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="inline-flex items-center gap-2 rounded-full border border-[#eadfd9] px-4 py-2 text-sm font-semibold text-[#806e67]"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="rounded-[2rem] border border-[#eadfd9] bg-white p-7 sm:p-9">
          <div className="text-xs font-black uppercase tracking-[.2em] text-[#b66f5a]">
            Your digital vault
          </div>
          <h1 className="mt-3 font-serif text-4xl font-black">Welcome back.</h1>
          <p className="mt-2 text-sm text-[#806e67]">
            Signed in as {email || "member"}
          </p>
        </div>

        {loading ? (
          <p className="mt-8 text-[#806e67]">Loading your purchases…</p>
        ) : entitlements.length > 0 ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {entitlements.map((item) => {
              const product = products[item.product_slug] ?? {
                name: item.product_slug,
                description: "Your purchased digital product.",
              };
              return (
                <article
                  key={item.product_slug}
                  className="rounded-[2rem] border border-[#eadfd9] bg-white p-6"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f1ddd5] text-[#9a5947]">
                    <Download className="h-5 w-5" />
                  </div>
                  <h2 className="mt-5 font-serif text-2xl font-black">
                    {product.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#806e67]">
                    {product.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => void downloadProduct(item.product_slug)}
                    disabled={downloading === item.product_slug}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#241b1a] px-5 py-3 text-sm font-black text-white disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {downloading === item.product_slug
                      ? "Preparing…"
                      : "Download"}
                  </button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-[2rem] border border-amber-300 bg-amber-50 p-6 text-amber-950">
            <div className="flex items-center gap-2 font-black">
              <LockKeyhole className="h-4 w-4" /> No active purchases yet
            </div>
            <p className="mt-2 text-sm text-amber-900/70">
              Purchases made while signed in appear here after PayPal confirms
              payment.
            </p>
            <Link to="/" className="mt-4 inline-block text-sm font-bold underline">
              Explore the digital vault
            </Link>
          </div>
        )}

        {error && (
          <p className="mt-5 text-sm text-red-700">
            Unable to load your purchase: {error}
          </p>
        )}
      </main>
    </div>
  );
}
