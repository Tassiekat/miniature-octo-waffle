import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { buildPayouts, DEFAULT_COMMISSION_RATE } from "@/lib/payouts";

export default defineTool({
  name: "get_payouts",
  title: "Get payouts",
  description:
    "Return TeleCash payout data: the pending payout balance, next payout date, and recent payout history (gross, referral commission, fees, net) so earnings-withdrawal questions can be answered.",
  inputSchema: {
    status: z
      .enum(["pending", "processing", "paid"])
      .optional()
      .describe("Filter payout history by status."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(24)
      .optional()
      .describe("Max payout records to return (default 6)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ status, limit }) => {
    const all = buildPayouts(12);
    const pending = all.filter((p) => p.status !== "paid");
    const filtered = status ? all.filter((p) => p.status === status) : all;
    const history = filtered.slice(0, limit ?? 6);

    const next = new Date();
    next.setMonth(next.getMonth() + 1, 1);

    const result = {
      currency: "USD",
      commission_rate: DEFAULT_COMMISSION_RATE,
      pending_balance_usd: pending.reduce((s, p) => s + p.net_usd, 0),
      pending_payout_count: pending.length,
      next_payout_date: next.toISOString().slice(0, 10),
      lifetime_paid_usd: all
        .filter((p) => p.status === "paid")
        .reduce((s, p) => s + p.net_usd, 0),
      payouts: history,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
