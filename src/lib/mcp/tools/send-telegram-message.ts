import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "send_telegram_message",
  title: "Send Telegram message",
  description:
    "Send a text message from the TeleCash bot to a specific Telegram chat_id via sendMessage.",
  inputSchema: {
    chat_id: z
      .union([z.string(), z.number()])
      .describe("Telegram chat_id or @channel_username to send to."),
    text: z.string().min(1).max(4096).describe("Message text (max 4096 chars)."),
    parse_mode: z
      .enum(["Markdown", "MarkdownV2", "HTML"])
      .optional()
      .describe("Optional Telegram parse mode."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ chat_id, text, parse_mode }) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return {
        content: [{ type: "text", text: "TELEGRAM_BOT_TOKEN is not configured." }],
        isError: true,
      };
    }
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id, text, parse_mode }),
    });
    const body = await res.json();
    if (!res.ok || !body.ok) {
      return {
        content: [{ type: "text", text: `sendMessage failed: ${JSON.stringify(body)}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Message sent (id ${body.result.message_id}).` }],
      structuredContent: { message: body.result },
    };
  },
});
