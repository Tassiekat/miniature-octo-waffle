import { useMutation, useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { getStripeStatus } from "@/lib/stripe-status.functions";
import { listWebhookRuns, testStripeWebhook } from "@/lib/webhook-test.functions";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  CreditCard,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { useState } from "react";

function StateBadge({ tone, label }: { tone: "ok" | "warn" | "bad"; label: string }) {
  const styles =
    tone === "ok"
      ? "bg-primary/15 text-primary"
      : tone === "warn"
        ? "bg-amber-500/15 text-amber-500"
        : "bg-destructive/15 text-destructive";
  const Icon = tone === "ok" ? CheckCircle2 : tone === "warn" ? AlertTriangle : XCircle;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${styles}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

export function StripeStatusPanel() {
  const [copied, setCopied] = useState(false);
  const { data, isFetching, refetch, error } = useQuery({
    queryKey: ["stripe-status"],
    queryFn: () => getStripeStatus(),
  });
  const history = useQuery({
    queryKey: ["stripe-webhook-runs"],
    queryFn: () => listWebhookRuns(),
  });
  const verify = useMutation({
    mutationFn: () => testStripeWebhook(),
    onSettled: () => {
      void refetch();
      void history.refetch();
    },
  });
  const test = verify.data;

  return (
    <Card className="border-border/60 bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Stripe payments
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Connection state, required fields, and webhook verification
            </p>
          </div>
        </div>
        <button
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          Could not read Stripe status.
        </p>
      )}

      {data && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/60 bg-background/50 p-4">
            <StateBadge
              tone={data.connected ? "ok" : "bad"}
              label={data.connected ? "Connected" : "Not connected"}
            />
            {data.mode !== "unknown" && (
              <StateBadge tone={data.mode === "live" ? "ok" : "warn"} label={`${data.mode} mode`} />
            )}
            {data.accountLabel && (
              <span className="text-xs text-muted-foreground">Account: {data.accountLabel}</span>
            )}
            <p className="w-full text-sm text-muted-foreground">{data.message}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Required fields
            </h4>
            <ul className="mt-3 space-y-2">
              {data.fields.map((f) => (
                <li
                  key={f.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{f.key}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{f.hint}</p>
                  </div>
                  <StateBadge
                    tone={f.present ? "ok" : f.required ? "bad" : "warn"}
                    label={f.present ? "Set" : "Missing"}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Webhook verification
            </h4>
            <div className="mt-3 rounded-lg border border-border/60 bg-background/50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <StateBadge
                  tone={
                    data.webhook.verification === "ok"
                      ? "ok"
                      : data.webhook.verification === "unverified"
                        ? "warn"
                        : "bad"
                  }
                  label={
                    data.webhook.verification === "ok"
                      ? "Signature verification ready"
                      : data.webhook.verification === "unverified"
                        ? "Unverified"
                        : "Failing"
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Signing secret {data.webhook.secretConfigured ? "stored" : "missing"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{data.webhook.detail}</p>

              <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2">
                <code className="flex-1 overflow-x-auto font-mono text-xs">{data.webhook.endpoint}</code>
                <button
                  onClick={() => {
                    void navigator.clipboard.writeText(data.webhook.endpoint);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] hover:bg-muted"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border/60 pt-4">
                <button
                  onClick={() => verify.mutate()}
                  disabled={verify.isPending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {verify.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <PlayCircle className="h-3.5 w-3.5" />
                  )}
                  {verify.isPending ? "Sending test event…" : "Test & Verify"}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  Sends a signed test event to this endpoint and checks that forged, replayed, and
                  unsigned deliveries are rejected.
                </span>
              </div>

              {verify.isError && (
                <p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                  Test run failed: {(verify.error as Error)?.message ?? "unknown error"}
                </p>
              )}

              {test && (
                <div className="mt-3 rounded-lg border border-border/60 bg-background/80 p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <StateBadge
                      tone={test.passed ? "ok" : "bad"}
                      label={test.passed ? "Verification passed" : "Verification failed"}
                    />
                    <span className="font-mono text-[11px] text-muted-foreground">{test.eventId}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{test.summary}</p>

                  {test.checks.length > 0 && (
                    <ul className="mt-3 space-y-2">
                      {test.checks.map((c) => (
                        <li
                          key={c.name}
                          className="rounded-md border border-border/60 bg-background/60 p-2.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-medium text-foreground">{c.name}</span>
                            <StateBadge
                              tone={c.passed ? "ok" : "bad"}
                              label={`${c.expected} → ${c.status ?? "no response"}`}
                            />
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground">{c.description}</p>
                          <pre className="mt-1.5 overflow-x-auto rounded bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground">
{c.body}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Ran {new Date(test.ranAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Verification history
            </h4>
            {history.data && history.data.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full min-w-[640px] text-left text-xs">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">When</th>
                      <th className="px-3 py-2 font-medium">Result</th>
                      <th className="px-3 py-2 font-medium">Passed / Failed</th>
                      <th className="px-3 py-2 font-medium">Event</th>
                      <th className="px-3 py-2 font-medium">Responses</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.map((run) => (
                      <tr key={run.id} className="border-t border-border/60 align-top">
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {new Date(run.ranAt).toLocaleString()}
                        </td>
                        <td className="px-3 py-2">
                          <StateBadge
                            tone={run.passed ? "ok" : "bad"}
                            label={run.passed ? "Passed" : "Failed"}
                          />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          <span className="text-primary">{run.checksPassed}</span> /{" "}
                          <span className="text-destructive">{run.checksFailed}</span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                          {run.eventId}
                        </td>
                        <td className="px-3 py-2">
                          {run.checks.length === 0 ? (
                            <span className="text-muted-foreground">{run.summary}</span>
                          ) : (
                            <ul className="space-y-1">
                              {run.checks.map((c) => (
                                <li key={c.name} className="text-[11px] text-muted-foreground">
                                  <span className={c.passed ? "text-primary" : "text-destructive"}>
                                    {c.name}
                                  </span>{" "}
                                  — HTTP {c.status ?? "none"}:{" "}
                                  <code className="font-mono">{c.body.slice(0, 80)}</code>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-border/60 bg-background/50 p-4 text-sm text-muted-foreground">
                No verification runs recorded yet. Run Test &amp; Verify to log one.
              </p>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Last checked {new Date(data.checkedAt).toLocaleTimeString()}
          </p>
        </div>
      )}
    </Card>
  );
}
