import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Link2,
  Terminal,
  Clock,
  Inbox,
  ArrowLeft,
} from 'lucide-react'
import { getBotStatus, type BotStatus } from '@/lib/bot-status.functions'
import { reregisterWebhook, type ReregisterResult } from '@/lib/bot-webhook.functions'
import { useServerFn } from '@tanstack/react-start'
import { Suspense, useEffect, useRef, useState } from 'react'


const botStatusQuery = queryOptions({
  queryKey: ['bot-status'],
  queryFn: () => getBotStatus(),
  staleTime: 15_000,
})

export const Route = createFileRoute('/bot-status')({
  head: () => ({
    meta: [
      { title: 'Bot Setup & Status — TeleCash' },
      { name: 'description', content: 'Webhook URL, last update time, and recent error logs for your Telegram bot.' },
      { property: 'og:title', content: 'Bot Setup & Status — TeleCash' },
      { property: 'og:description', content: 'Live webhook health, delivery status, and error logs for your Telegram bot.' },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(botStatusQuery),
  errorComponent: ({ error, reset }) => {
    const router = useRouter()
    return (
      <div className="mx-auto max-w-2xl p-8">
        <Card className="border-destructive/40 p-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="font-semibold">Couldn't load bot status</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{String(error?.message ?? error)}</p>
          <Button className="mt-4" onClick={() => { reset(); router.invalidate() }}>Try again</Button>
        </Card>
      </div>
    )
  },
  notFoundComponent: () => <div className="p-8">Not found</div>,
  component: BotStatusPage,
})

function BotStatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-none">Bot Setup &amp; Status</h1>
              <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">Telegram webhook health</p>
            </div>
          </div>
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-8">
        <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
          <StatusView />
        </Suspense>
      </main>
    </div>
  )
}

function StatusView() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [reregistering, setReregistering] = useState(false)
  const [reregResult, setReregResult] = useState<ReregisterResult | null>(null)
  const { data } = useSuspenseQuery(botStatusQuery)
  const reregister = useServerFn(reregisterWebhook)

  async function refresh() {
    setRefreshing(true)
    try {
      await router.invalidate()
    } finally {
      setRefreshing(false)
    }
  }

  async function handleReregister() {
    setReregistering(true)
    try {
      const result = await reregister()
      setReregResult(result)
      await router.invalidate()
    } catch (e: any) {
      setReregResult({ ok: false, url: '', at: new Date().toISOString(), error: e?.message ?? String(e) })
    } finally {
      setReregistering(false)
    }
  }


  const s = data as BotStatus
  const healthy = s.ok && !!s.webhook?.url && !s.webhook?.last_error_message
  const hasError = !!s.error || !!s.webhook?.last_error_message

  const [autoRefresh, setAutoRefresh] = useState(false)
  const [intervalSec, setIntervalSec] = useState(15)
  const refreshingRef = useRef(false)
  refreshingRef.current = refreshing

  useEffect(() => {
    if (!autoRefresh) return
    const id = window.setInterval(() => {
      if (!refreshingRef.current && !document.hidden) void refresh()
    }, intervalSec * 1000)
    return () => window.clearInterval(id)
  }, [autoRefresh, intervalSec])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusBadge healthy={healthy} configured={s.configured} hasError={hasError} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>Checked {new Date(s.fetched_at).toLocaleTimeString()}</span>
          <label className="ml-2 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border/60 bg-background/60 px-2 py-1">
            <input
              type="checkbox"
              className="h-3 w-3 accent-primary"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <span className="text-foreground">Auto-refresh</span>
          </label>
          <select
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            disabled={!autoRefresh}
            className="rounded-md border border-border/60 bg-background/60 px-2 py-1 text-xs text-foreground disabled:opacity-50"
            aria-label="Auto-refresh interval"
          >
            <option value={5}>5s</option>
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>1m</option>
            <option value={300}>5m</option>
          </select>
          <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="ml-1">
            <RefreshCw className={'h-3.5 w-3.5 ' + (refreshing ? 'animate-spin' : '')} />
            Refresh
          </Button>
        </div>
      </div>


      {!s.configured && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-medium">Bot token not configured</p>
              <p className="text-sm text-muted-foreground">
                Set <code className="rounded bg-muted px-1 py-0.5 text-xs">TELEGRAM_BOT_TOKEN</code> in project secrets, then reload.
              </p>
            </div>
          </div>
        </Card>
      )}

      {s.error && s.configured && (
        <Card className="border-destructive/40 bg-destructive/5 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Telegram API error</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.error}</p>
            </div>
          </div>
        </Card>
      )}

      {s.bot && (
        <Card className="border-border/60 bg-card p-6">
          <SectionTitle icon={Bot}>Bot</SectionTitle>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Username" value={`@${s.bot.username}`} />
            <Field label="Display name" value={s.bot.first_name} />
            <Field label="Bot ID" value={String(s.bot.id)} mono />
          </div>
          <div className="mt-4 flex gap-2">
            <a
              href={`https://t.me/${s.bot.username}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              Open in Telegram <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </Card>
      )}

      {s.webhook && (
        <Card className="border-border/60 bg-card p-6">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle icon={Link2}>Webhook</SectionTitle>
            <Button size="sm" onClick={handleReregister} disabled={reregistering || !s.configured}>
              <RefreshCw className={'h-3.5 w-3.5 ' + (reregistering ? 'animate-spin' : '')} />
              {reregistering ? 'Re-registering…' : 'Re-register webhook'}
            </Button>
          </div>
          {reregResult && (
            <div
              className={
                'mt-4 rounded-lg border p-3 text-sm ' +
                (reregResult.ok
                  ? 'border-primary/30 bg-primary/5 text-foreground'
                  : 'border-destructive/40 bg-destructive/5 text-destructive')
              }
            >
              <div className="flex items-center gap-2 font-medium">
                {reregResult.ok ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <AlertTriangle className="h-4 w-4" />}
                {reregResult.ok ? 'Webhook re-registered' : 'Re-registration failed'}
              </div>
              {reregResult.url && (
                <div className="mt-1.5 break-all font-mono text-xs text-muted-foreground">{reregResult.url}</div>
              )}
              {reregResult.error && <div className="mt-1.5 text-xs">{reregResult.error}</div>}
              <div className="mt-1 text-[11px] text-muted-foreground">
                {new Date(reregResult.at).toLocaleString()}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Endpoint URL</div>
              <UrlRow url={s.webhook.url || '(not set)'} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="IP address" value={s.webhook.ip_address ?? '—'} mono />
              <Field label="Max connections" value={String(s.webhook.max_connections ?? '—')} />
              <Field label="Pending updates" value={String(s.webhook.pending_update_count)} highlight={s.webhook.pending_update_count > 0} />
            </div>
            <div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Allowed updates</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(s.webhook.allowed_updates ?? []).map((u) => (
                  <span key={u} className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5 text-xs">{u}</span>
                ))}
                {(!s.webhook.allowed_updates || s.webhook.allowed_updates.length === 0) && (
                  <span className="text-xs text-muted-foreground">all update types</span>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="border-border/60 bg-card p-6">
        <SectionTitle icon={Terminal}>Error log</SectionTitle>
        <div className="mt-4 space-y-3">
          <LogRow
            label="Last delivery error"
            date={s.webhook?.last_error_date ?? null}
            message={s.webhook?.last_error_message ?? null}
          />
          <LogRow
            label="Last sync error"
            date={s.webhook?.last_synchronization_error_date ?? null}
            message={null}
          />
        </div>
        {!s.webhook?.last_error_message && !s.webhook?.last_synchronization_error_date && (
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            No errors reported by Telegram.
          </p>
        )}
      </Card>

      {s.commands && (
        <Card className="border-border/60 bg-card p-6">
          <SectionTitle icon={Inbox}>Registered commands</SectionTitle>
          <ul className="mt-4 divide-y divide-border/60">
            {s.commands.length === 0 && <li className="py-2 text-sm text-muted-foreground">No commands registered.</li>}
            {s.commands.map((c) => (
              <li key={c.command} className="flex items-center justify-between py-2.5">
                <span className="font-mono text-sm">/{c.command}</span>
                <span className="text-sm text-muted-foreground">{c.description}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  )
}

function StatusBadge({ healthy, configured, hasError }: { healthy: boolean; configured: boolean; hasError: boolean }) {
  if (!configured) return <Pill tone="muted">Not configured</Pill>
  if (hasError) return <Pill tone="warn"><AlertTriangle className="h-3.5 w-3.5" /> Attention needed</Pill>
  if (healthy) return <Pill tone="ok"><CheckCircle2 className="h-3.5 w-3.5" /> Healthy</Pill>
  return <Pill tone="muted">Unknown</Pill>
}

function Pill({ children, tone }: { children: React.ReactNode; tone: 'ok' | 'warn' | 'muted' }) {
  const cls =
    tone === 'ok'
      ? 'bg-primary/15 text-primary border-primary/30'
      : tone === 'warn'
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
        : 'bg-secondary text-muted-foreground border-border/60'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${cls}`}>
      {children}
    </span>
  )
}

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-muted-foreground">
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </div>
  )
}

function Field({ label, value, mono, highlight }: { label: string; value: string; mono?: boolean; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? 'font-mono' : 'font-semibold'} ${highlight ? 'text-amber-500' : ''}`}>{value}</div>
    </div>
  )
}

function UrlRow({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2.5">
      <span className="truncate font-mono text-xs text-foreground/90">{url}</span>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto"
        onClick={() => {
          navigator.clipboard.writeText(url).catch(() => {})
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }}
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </div>
  )
}

function LogRow({ label, date, message }: { label: string; date: number | null; message: string | null }) {
  const when = date ? new Date(date * 1000) : null
  return (
    <div className="rounded-lg border border-border/60 bg-background/50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{when ? when.toLocaleString() : 'never'}</div>
      </div>
      {message && <div className="mt-1.5 font-mono text-xs text-destructive">{message}</div>}
    </div>
  )
}
