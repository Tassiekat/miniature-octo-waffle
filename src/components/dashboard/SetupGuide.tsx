import { Card } from "@/components/ui/card";
import { Bot, Webhook, KeyRound, CreditCard } from "lucide-react";

const steps = [
  {
    icon: Bot,
    title: "Create your bot with BotFather",
    body: "Open Telegram, message @BotFather, run /newbot, pick a name and username. Save the HTTP API token he gives you.",
  },
  {
    icon: KeyRound,
    title: "Store your bot token securely",
    body: "Add TELEGRAM_BOT_TOKEN to your environment variables. Never commit the token to your repo or expose it in client code.",
  },
  {
    icon: Webhook,
    title: "Register both webhooks",
    body: "Point Telegram at /api/public/telegram/webhook and Whop at /api/webhooks/whop. Whop webhook signatures are verified server-side before payment records are accepted.",
  },
  {
    icon: CreditCard,
    title: "Connect Whop checkout",
    body: "Create your Basic, Pro and VIP plans in Whop, add their IDs as WHOP_PLAN_BASIC, WHOP_PLAN_PRO and WHOP_PLAN_VIP, then add WHOP_API_KEY and WHOP_WEBHOOK_SECRET to your server secrets.",
  },
];

export function SetupGuide() {
  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Connect a real Telegram bot</h3>
          <p className="mt-1 text-xs text-muted-foreground">Four steps to take this dashboard from demo to revenue</p>
        </div>
      </div>

      <ol className="mt-6 space-y-4">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-4 rounded-lg border border-border/60 bg-background/50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <s.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step {i + 1}</span>
              </div>
              <h4 className="mt-0.5 font-semibold">{s.title}</h4>
              <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <pre className="mt-5 overflow-x-auto rounded-lg border border-border/60 bg-background/80 p-4 font-mono text-xs leading-relaxed text-foreground/90">
{`curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \\
  -d "url=https://yourdomain.com/api/public/telegram/webhook"`}
      </pre>
    </Card>
  );
}
