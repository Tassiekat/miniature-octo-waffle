import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useMemo, useState } from "react";
import { generateMembers, type Tier } from "@/lib/fake-data";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

const tierBadge: Record<Tier, string> = {
  Basic: "bg-secondary text-muted-foreground",
  Pro: "bg-chart-3/20 text-chart-3",
  VIP: "bg-primary/20 text-primary",
};

const statusBadge: Record<string, string> = {
  Active: "bg-primary/15 text-primary",
  "Past due": "bg-warning/20 text-warning",
  Cancelled: "bg-destructive/15 text-destructive",
};

export function MembersTable() {
  const all = useMemo(() => generateMembers(24), []);
  const [q, setQ] = useState("");
  const filtered = all.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()) || m.handle.includes(q.toLowerCase()));

  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Members</h3>
          <p className="mt-1 text-xs text-muted-foreground">{all.length} total members across all tiers</p>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search members…"
            className="h-9 w-56 pl-8"
          />
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40">
              <TableHead>Member</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Referred by</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((m) => (
              <TableRow key={m.id} className="border-border/60">
                <TableCell>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">{m.handle}</div>
                </TableCell>
                <TableCell>
                  <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + tierBadge[m.tier]}>
                    {m.tier}
                  </span>
                </TableCell>
                <TableCell className="text-sm tabular-nums text-muted-foreground">{m.joined}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{m.referrer}</TableCell>
                <TableCell className="text-right">
                  <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider " + statusBadge[m.status]}>
                    {m.status}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
