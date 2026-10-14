import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import { getPayoutSummary } from "@/lib/payouts";
import { CalendarDays, Wallet } from "lucide-react";

export function PayoutsSummaryCard() {
  const summary = getPayoutSummary(6);

  return (
    <Card className="relative overflow-hidden border-border/60 bg-card p-5 ring-1 ring-primary/20">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payouts summary</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            <AnimatedCounter value={summary.pending_balance_usd} prefix="$" />
          </div>
          <div className="mt-2 text-xs font-medium text-primary">▲ {summary.pending_payout_count} pending</div>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
          <Wallet className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5 text-primary" />
        <span>
          Next payout on{" "}
          <span className="font-medium text-foreground">
            {new Date(summary.next_payout_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </span>
      </div>

      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
    </Card>
  );
}
