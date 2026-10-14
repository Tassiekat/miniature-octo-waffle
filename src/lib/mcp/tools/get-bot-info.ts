import { defineTool } from "@lovable.dev/mcp-js";

export default defineTool({
  name: "get_bot_info",
  title: "Get bot info",
  description:
    "Fetch the connected Telegram bot's identity (username, display name, id) via getMe.",
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
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const body = await res.json();
    if (!res.ok || !body.ok) {
      return {
        content: [{ type: "text", text: `getMe failed: ${JSON.stringify(body)}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(body.result, null, 2) }],
      structuredContent: { bot: body.result },
    };
  },
});
