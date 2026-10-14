import { Card } from "@/components/ui/card";
import { Check, Crown, Sparkles, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Basic",
    price: 5,
    icon: Zap,
    perks: ["Daily signals channel", "Community chat access", "Weekly market recap", "Email support"],
    highlight: false,
  },
  {
    name: "Pro",
    price: 15,
    icon: Sparkles,
    perks: ["Everything in Basic", "Real-time trade alerts", "Private strategy sessions", "Priority support"],
    highlight: true,
  },
  {
    name: "VIP",
    price: 30,
    icon: Crown,
    perks: ["Everything in Pro", "1:1 mentor calls", "VIP-only signals room", "Early access to launches"],
    highlight: false,
  },
];

export function MembershipTiers() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {tiers.map((t) => (
        <Card
          key={t.name}
          className={cn(
            "relative flex flex-col border-border/60 bg-card p-6",
            t.highlight && "border-primary/40 ring-1 ring-primary/30"
          )}
        >
          {t.highlight && (
            <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
              Most popular
            </span>
          )}
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg",
              t.highlight ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
            )}>
              <t.icon className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">{t.name}</h3>
          </div>
          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-semibold tabular-nums">${t.price}</span>
            <span className="text-sm text-muted-foreground">/mo</span>
          </div>
          <ul className="mt-5 flex-1 space-y-2.5 text-sm">
            {t.perks.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="text-foreground/90">{p}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
