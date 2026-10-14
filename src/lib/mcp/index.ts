import { auth, defineMcp } from "@lovable.dev/mcp-js";

import getBotInfo from "./tools/get-bot-info";
import getWebhookStatus from "./tools/get-webhook-status";
import getDashboardStats from "./tools/get-dashboard-stats";
import listMembers from "./tools/list-members";
import getPayouts from "./tools/get-payouts";
import sendTelegramMessage from "./tools/send-telegram-message";

// Use the direct Supabase issuer — the runtime SUPABASE_URL becomes a
// .lovable.cloud proxy on publish, which mcp-js rejects. The project ref
// is stable, so build the issuer from VITE_SUPABASE_PROJECT_ID (Vite inlines
// this literal at build time). The fallback keeps the issuer well-formed
// during the manifest-extract eval; the published build inlines the real ref.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "telecash-mcp",
  title: "TeleCash",
  version: "0.1.0",
  instructions:
    "Tools for TeleCash — the Telegram membership + referral bot dashboard. Use `get_bot_info` and `get_webhook_status` for bot health, `get_dashboard_stats` and `list_members` for business metrics, `get_payouts` for pending payout balance and payout history, and `send_telegram_message` to message a specific chat_id from the bot.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getBotInfo, getWebhookStatus, getDashboardStats, listMembers, getPayouts, sendTelegramMessage],
});
