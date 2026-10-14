import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, CreditCard, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const products = {
  "ai-side-hustle-kit-2026": {
    name: "AI Side Hustle Kit 2026",
    price: "A$19",
    description: "The practical AI side-hustle starter system.",
  },
  "creator-blueprint": {
    name: "Creator Blueprint",
    price: "A$12",
    description: "Content prompts and a simple creator income system.",
  },
  "digital-income-planner": {
    name: "Digital Income Planner",
    price: "A$9",
    description: "Plan products, launches, content and revenue goals.",
  },
} as const;

type ProductSlug = keyof typeof products;

export const Route = createFileRoute("/checkout")({
  validateSearch: (search: Record<string, unknown>) => ({
    product:
      typeof search.product === "string"
        ? search.product
        : "ai-side-hustle-kit-2026",
    cancelled: search.cancelled === "1",
    payment_error:
      typeof search.payment_error === "string" ? search.payment_error : "",
  }),
  head: () => ({
    meta: [
      { title: "Checkout — Gen Earn Hub" },
      {
        name: "description",
        content: "Secure PayPal checkout for Gen Earn Hub digital products.",
      },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const {
    product: rawProduct,
    cancelled,
    payment_error: paymentError,
  } = Route.useSearch();
  const slug = (
    rawProduct in products ? rawProduct : "ai-side-hustle-kit-2026"
  ) as ProductSlug;
  const product = products[slug];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    paymentError
      ? "PayPal could not confirm that payment. You have not been charged again—please retry or contact support."
      : cancelled
        ? "Checkout was cancelled. No payment was taken."
        : null,
  );

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
        error: authError,
      } = await supabase.auth.getSession();
      if (authError) throw authError;
      if (!session) {
        window.location.assign(
          `/auth?next=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        );
        return;
      }

      const response = await fetch("/api/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ product: slug }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.url) {
        throw new Error(
          result?.error || "Unable to start PayPal checkout. Please try again.",
        );
      }
      window.location.assign(result.url);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to start checkout.",
      );
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#241b1a]">
      <header className="border-b border-[#eadfd9] bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241b1a] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="font-serif text-sm font-bold">Gen Earn Hub</p>
              <p className="text-[10px] uppercase tracking-wider text-[#8c7770]">
                Digital Vault
              </p>
            </div>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#806e67]"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to vault
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:px-8 lg:grid-cols-[1fr_.85fr]">
        <section>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#b66f5a]">
            Secure PayPal checkout
          </div>
          <h1 className="mt-3 font-serif text-4xl font-black tracking-tight">
            Get your digital product.
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#806e67]">
            Complete your one-time purchase securely through PayPal. Sign in
            first so your download can be linked to your account.
          </p>
          <div className="mt-8 space-y-3">
            {[
              "One-time AUD payment",
              "Secure PayPal-hosted payment page",
              "Access linked to your Gen Earn Hub account",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-[#eadfd9] bg-white p-4 text-sm font-semibold"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f1ddd5] text-[#9a5947]">
                  <Check className="h-4 w-4" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-[#eadfd9] bg-white p-6 shadow-xl shadow-[#b66f5a]/5 sm:p-8">
          <div className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#8c7770]">
            <LockKeyhole className="h-4 w-4" /> Your order
          </div>
          <h2 className="font-serif text-2xl font-black">{product.name}</h2>
          <p className="mt-2 text-sm leading-6 text-[#806e67]">
            {product.description}
          </p>
          <div className="my-7 flex items-end justify-between border-y border-[#eadfd9] py-5">
            <span className="text-sm font-semibold text-[#806e67]">
              One-time purchase
            </span>
            <span className="text-3xl font-black">{product.price}</span>
          </div>
          {error && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-800">
              {error}
            </div>
          )}
          <button
            onClick={startCheckout}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0070ba] px-5 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60"
          >
            <CreditCard className="h-4 w-4" />
            {loading ? "Opening PayPal…" : "Pay securely with PayPal"}
          </button>
          <p className="mt-4 text-center text-[11px] leading-5 text-[#9a8a84]">
            Access is granted only after PayPal confirms a completed payment.
          </p>
        </section>
      </main>
    </div>
  );
}
