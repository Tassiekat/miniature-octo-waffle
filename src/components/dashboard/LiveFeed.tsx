import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { randomName, randomTier, TIER_PRICES, type Tier } from "@/lib/fake-data";

interface Tx {
  id: string;
  name: string;
  tier: Tier;
  amount: number;
  time: Date;
}

function seedTx(n: number): Tx[] {
  const now = Date.now();
  return Array.from({ length: n }).map((_, i) => {
    const tier = randomTier();
    return {
      id: `tx_${now}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      name: randomName(),
      tier,
      amount: TIER_PRICES[tier],
      time: new Date(now - i * 1000 * 60 * (1 + Math.random() * 4)),
    };
  });
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

const tierColor: Record<Tier, string> = {
  Basic: "bg-secondary text-muted-foreground",
  Pro: "bg-chart-3/20 text-chart-3",
  VIP: "bg-primary/20 text-primary",
};

export function LiveFeed() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [, force] = useState(0);

  useEffect(() => {
    setTxs(seedTx(8));
    const add = setInterval(() => {
      const tier = randomTier();
      const tx: Tx = {
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: randomName(),
        tier,
        amount: TIER_PRICES[tier],
        time: new Date(),
      };
      setTxs((prev) => [tx, ...prev].slice(0, 10));
    }, 3500 + Math.random() * 2500);

    const tick = setInterval(() => force((n) => n + 1), 1000);
    return () => {
      clearInterval(add);
      clearInterval(tick);
    };
  }, []);


  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Live payments</h3>
          <p className="mt-1 text-xs text-muted-foreground">Streaming in real time from your bot</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-primary">
          <span className="pulse-dot inline-block h-2 w-2 rounded-full bg-primary" />
          LIVE
        </div>
      </div>

      <ul className="mt-5 divide-y divide-border/60">
        {txs.map((tx, idx) => (
          <li
            key={tx.id}
            className={"flex items-center justify-between py-3 " + (idx === 0 ? "animate-slide-down" : "")}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                {tx.name.split(" ").map((p) => p[0]).join("")}
              </div>
              <div>
                <div className="text-sm font-medium">{tx.name}</div>
                <div className="text-xs text-muted-foreground">{timeAgo(tx.time)}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + tierColor[tx.tier]}>
                {tx.tier}
              </span>
              <span className="tabular-nums text-sm font-semibold text-primary">+${tx.amount}</span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
