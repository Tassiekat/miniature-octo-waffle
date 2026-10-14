import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { generateMembers } from "@/lib/fake-data";

export default defineTool({
  name: "list_members",
  title: "List members",
  description: "List TeleCash members with tier, join date, referrer, and status.",
  inputSchema: {
    tier: z
      .enum(["Basic", "Pro", "VIP"])
      .optional()
      .describe("Filter by membership tier."),
    status: z
      .enum(["Active", "Past due", "Cancelled"])
      .optional()
      .describe("Filter by member status."),
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ tier, status, limit }) => {
    let rows = generateMembers(120);
    if (tier) rows = rows.filter((m) => m.tier === tier);
    if (status) rows = rows.filter((m) => m.status === status);
    if (limit) rows = rows.slice(0, limit);
    return {
      content: [{ type: "text", text: JSON.stringify(rows, null, 2) }],
      structuredContent: { members: rows, count: rows.length },
    };
  },
});
