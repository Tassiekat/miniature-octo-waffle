import { defineTool } from "@lovable.dev/mcp-js";
import { generateMembers, generateDailyEarnings, TIER_PRICES } from "@/lib/fake-data";

export default defineTool({
  name: "get_dashboard_stats",
  title: "Get dashboard stats",
  description:
    "Return TeleCash dashboard totals: total earnings (30d), active members by tier, MRR, and pending payouts.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => {
    const members = generateMembers(120);
    const active = members.filter((m) => m.status === "Active");
    const byTier = { Basic: 0, Pro: 0, VIP: 0 } as Record<string, number>;
    let mrr = 0;
    for (const m of active) {
      byTier[m.tier] = (byTier[m.tier] ?? 0) + 1;
      mrr += TIER_PRICES[m.tier as keyof typeof TIER_PRICES] ?? 0;
    }
    const earnings30d = generateDailyEarnings(30).reduce((s, d) => s + d.earnings, 0);
    const pendingPayouts = Math.round(mrr * 0.3);

    const stats = {
      earnings_last_30_days_usd: earnings30d,
      monthly_recurring_revenue_usd: mrr,
      active_members: active.length,
      members_by_tier: byTier,
      pending_referral_payouts_usd: pendingPayouts,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      structuredContent: stats,
    };
  },
});
