import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { generateLeaderboard } from "@/lib/fake-data";

export function ReferralPanel() {
  const [copied, setCopied] = useState(false);
  const link = "https://t.me/YourBot?start=ref_a3f9c2";
  const leaders = useMemo(() => generateLeaderboard(), []);

  function copy() {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="border-border/60 bg-card p-6 lg:col-span-2">
        <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Your referral link</h3>
        <p className="mt-1 text-xs text-muted-foreground">Earn 30% commission on every paid signup, forever.</p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5 font-mono text-xs">
          <span className="truncate text-foreground/90">{link}</span>
          <Button size="sm" variant={copied ? "secondary" : "default"} onClick={copy} className="ml-auto">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="Referrals" value="47" />
          <Stat label="Conversions" value="31" />
          <Stat label="Commission" value="$486" accent />
        </div>
      </Card>

      <Card className="border-border/60 bg-card p-6 lg:col-span-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Top referrers</h3>
          <Trophy className="h-4 w-4 text-primary" />
        </div>
        <ul className="mt-4 divide-y divide-border/60">
          {leaders.map((l) => (
            <li key={l.rank} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className={
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold tabular-nums " +
                  (l.rank === 1 ? "bg-primary text-primary-foreground" :
                   l.rank <= 3 ? "bg-primary/20 text-primary" : "bg-secondary text-muted-foreground")
                }>
                  {l.rank}
                </span>
                <div>
                  <div className="text-sm font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.handle}</div>
                </div>
              </div>
              <div className="flex items-center gap-6 text-right">
                <div className="hidden sm:block">
                  <div className="text-xs text-muted-foreground">Referrals</div>
                  <div className="text-sm font-semibold tabular-nums">{l.referrals}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Earned</div>
                  <div className="text-sm font-semibold tabular-nums text-primary">${l.commission}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={"mt-1 text-lg font-semibold tabular-nums " + (accent ? "text-primary" : "")}>{value}</div>
    </div>
  );
}
