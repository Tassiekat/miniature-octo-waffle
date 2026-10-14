import { createServerFn } from '@tanstack/react-start'

export type BotStatus = {
  ok: boolean
  configured: boolean
  bot?: {
    id: number
    username: string
    first_name: string
    can_join_groups: boolean
    can_read_all_group_messages: boolean
  }
  webhook?: {
    url: string
    pending_update_count: number
    max_connections: number | null
    ip_address: string | null
    allowed_updates: string[] | null
    has_custom_certificate: boolean
    last_error_date: number | null
    last_error_message: string | null
    last_synchronization_error_date: number | null
  }
  commands?: { command: string; description: string }[]
  fetched_at: string
  error?: string
}

async function tg(token: string, method: string): Promise<any> {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`)
  const j = await r.json()
  if (!j.ok) throw new Error(`${method}: ${j.description ?? r.status}`)
  return j.result
}

export const getBotStatus = createServerFn({ method: 'GET' }).handler(async (): Promise<BotStatus> => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const fetched_at = new Date().toISOString()
  if (!token) return { ok: false, configured: false, fetched_at, error: 'TELEGRAM_BOT_TOKEN is not set' }
  try {
    const [me, wh, cmds] = await Promise.all([tg(token, 'getMe'), tg(token, 'getWebhookInfo'), tg(token, 'getMyCommands')])
    return {
      ok: true,
      configured: true,
      fetched_at,
      bot: {
        id: me.id,
        username: me.username,
        first_name: me.first_name,
        can_join_groups: me.can_join_groups,
        can_read_all_group_messages: me.can_read_all_group_messages,
      },
      webhook: {
        url: wh.url ?? '',
        pending_update_count: wh.pending_update_count ?? 0,
        max_connections: wh.max_connections ?? null,
        ip_address: wh.ip_address ?? null,
        allowed_updates: wh.allowed_updates ?? null,
        has_custom_certificate: !!wh.has_custom_certificate,
        last_error_date: wh.last_error_date ?? null,
        last_error_message: wh.last_error_message ?? null,
        last_synchronization_error_date: wh.last_synchronization_error_date ?? null,
      },
      commands: cmds ?? [],
    }
  } catch (e: any) {
    return { ok: false, configured: true, fetched_at, error: e?.message ?? 'unknown error' }
  }
})
