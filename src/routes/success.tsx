import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole, Sparkles } from "lucide-react";

const products = {
  "ai-side-hustle-kit-2026": "AI Side Hustle Kit 2026",
  "creator-blueprint": "Creator Blueprint",
  "digital-income-planner": "Digital Income Planner",
} as const;

type ProductSlug = keyof typeof products;

export const Route = createFileRoute("/success")({
  validateSearch: (search: Record<string, unknown>) => ({
    provider: typeof search.provider === "string" ? search.provider : "",
    product: typeof search.product === "string" ? search.product : "",
  }),
  head: () => ({
    meta: [{ title: "Purchase complete — Gen Earn Hub" }],
  }),
  component: SuccessPage,
});

function SuccessPage() {
  const { provider, product: rawProduct } = Route.useSearch();
  const product =
    rawProduct in products ? (rawProduct as ProductSlug) : null;
  const paypalConfirmed = provider === "paypal" && product !== null;

  return (
    <div className="min-h-screen bg-[#fffaf7] text-[#241b1a]">
      <header className="border-b border-[#eadfd9] bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-5 py-4 sm:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#241b1a] text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <p className="font-serif text-sm font-bold">Gen Earn Hub</p>
            <p className="text-[10px] uppercase tracking-wider text-[#8c7770]">
              Digital Vault
            </p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-20 text-center sm:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#dff1e7] text-[#387a55]">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-[#b66f5a]">
          Payment confirmed
        </div>
        <h1 className="mt-3 font-serif text-4xl font-black">
          {paypalConfirmed ? "Your purchase is ready." : "We’re confirming your purchase."}
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#806e67]">
          {paypalConfirmed && product
            ? `${products[product]} has been added to your member vault.`
            : "Open your member vault to check your purchase status."}
        </p>
        <Link
          to="/dashboard"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#241b1a] px-5 py-3 text-sm font-bold text-white"
        >
          <LockKeyhole className="h-4 w-4" /> Open member vault
        </Link>
        <div>
          <Link
            to="/"
            className="mt-5 inline-flex rounded-full border border-[#eadfd9] bg-white px-5 py-3 text-sm font-bold"
          >
            Return to the store
          </Link>
        </div>
      </main>
    </div>
  );
}
