import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_webhook_status",
  title: "Get webhook status",
  description:
    "Return the Telegram webhook URL, pending update count, last error, and allowed update types.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async () => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return {
        content: [{ type: "text", text: "TELEGRAM_BOT_TOKEN is not configured." }],
        isError: true,
      };
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const body = await res.json();
    if (!res.ok || !body.ok) {
      return {
        content: [{ type: "text", text: `getWebhookInfo failed: ${JSON.stringify(body)}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(body.result, null, 2) }],
      structuredContent: { webhook: body.result },
    };
  },
});
