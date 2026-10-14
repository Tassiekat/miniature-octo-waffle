import { Card } from "@/components/ui/card";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { generateDailyEarnings } from "@/lib/fake-data";
import { useMemo } from "react";

export function EarningsChart() {
  const data = useMemo(() => generateDailyEarnings(30), []);
  const total = data.reduce((s, d) => s + d.earnings, 0);

  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Earnings · last 30 days</h3>
          <div className="mt-1 text-3xl font-semibold tabular-nums">${total.toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          Daily revenue
        </div>
      </div>

      <div className="mt-6 h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="earningsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
            <Tooltip
              contentStyle={{
                background: "var(--color-popover)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-muted-foreground)" }}
              formatter={(v: number) => [`$${v}`, "Earnings"]}
            />
            <Area type="monotone" dataKey="earnings" stroke="var(--color-primary)" strokeWidth={2} fill="url(#earningsFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
