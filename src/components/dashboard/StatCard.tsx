import { Card } from "@/components/ui/card";
import { AnimatedCounter } from "@/components/AnimatedCounter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  delta?: string;
  positive?: boolean;
  icon: LucideIcon;
  accent?: boolean;
}

export function StatCard({ label, value, prefix, suffix, decimals, delta, positive = true, icon: Icon, accent }: Props) {
  return (
    <Card className={cn(
      "relative overflow-hidden border-border/60 bg-card p-5",
      accent && "ring-1 ring-primary/30"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight">
            <AnimatedCounter value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
          </div>
          {delta && (
            <div className={cn("mt-2 text-xs font-medium", positive ? "text-primary" : "text-destructive")}>
              {positive ? "▲" : "▼"} {delta}
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-lg",
          accent ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
        )}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {accent && (
        <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      )}
    </Card>
  );
}
