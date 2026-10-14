import { createServerFn } from '@tanstack/react-start'
import { getRequestHost, getRequestHeader } from '@tanstack/react-start/server'
import { createHash } from 'crypto'

export type ReregisterResult = {
  ok: boolean
  url: string
  telegram?: any
  error?: string
  at: string
}

function deriveWebhookSecret(token: string): string {
  return createHash('sha256').update(`telegram-webhook:${token}`).digest('base64url')
}

export const reregisterWebhook = createServerFn({ method: 'POST' }).handler(
  async (): Promise<ReregisterResult> => {
    const at = new Date().toISOString()
    const token = process.env.TELEGRAM_BOT_TOKEN
    if (!token) return { ok: false, url: '', at, error: 'TELEGRAM_BOT_TOKEN is not set' }

    // Derive URL from the current request host (same-origin server fn).
    const proto = getRequestHeader('x-forwarded-proto') ?? 'https'
    const host = getRequestHost()
    if (!host) return { ok: false, url: '', at, error: 'Unable to determine host' }
    const url = `${proto}://${host}/api/public/telegram/webhook`

    try {
      const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          secret_token: deriveWebhookSecret(token),
          allowed_updates: ['message', 'edited_message', 'callback_query'],
          drop_pending_updates: false,
        }),
      })
      const j = await r.json()
      if (!j.ok) return { ok: false, url, at, error: j.description ?? `HTTP ${r.status}`, telegram: j }
      return { ok: true, url, at, telegram: j }
    } catch (e: any) {
      return { ok: false, url, at, error: e?.message ?? 'unknown error' }
    }
  },
)
