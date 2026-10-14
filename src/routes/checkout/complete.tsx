import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/checkout/complete")({
  component: CheckoutComplete,
});

function CheckoutComplete() {
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSuccess(new URLSearchParams(window.location.search).get("status") === "success");
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {success ? (
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        ) : (
          <Clock3 className="mx-auto h-12 w-12 text-muted-foreground" />
        )}
        <h1 className="mt-5 text-2xl font-semibold">
          {success ? "Payment received" : "Checkout returned"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
          {success
            ? "Your payment has been submitted to Whop. Access is granted from the verified webhook, so it may take a moment to appear."
            : "If you canceled or the payment provider needs another step, return to checkout and try again."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground"
        >
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}
