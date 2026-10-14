import { createFileRoute } from '@tanstack/react-router'
import { createHash, timingSafeEqual } from 'crypto'
import { createWhopCheckout, getWhopPlanId, type WhopPlanKey } from '@/lib/whop.server'

function deriveWebhookSecret(token: string): string {
  return createHash('sha256').update(`telegram-webhook:${token}`).digest('base64url')
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

async function sendMessage(token: string, chatId: number, text: string, extra: Record<string, unknown> = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', ...extra }),
  })
  if (!res.ok) console.error('sendMessage failed', res.status, await res.text())
}

function tiersKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '⭐ Basic — $5/mo', callback_data: 'tier:basic' }],
      [{ text: '🚀 Pro — $15/mo', callback_data: 'tier:pro' }],
      [{ text: '💎 VIP — $30/mo', callback_data: 'tier:vip' }],
    ],
  }
}

async function handleCommand(
  token: string,
  chatId: number,
  userId: number,
  username: string | undefined,
  command: string,
  args: string,
) {
  if (command === '/start') {
    const refMatch = args.match(/^ref_([A-Za-z0-9_-]+)/)
    const intro = refMatch
      ? `Welcome! You were referred by <code>${refMatch[1]}</code>. They'll earn 30% commission on your membership.\n\n`
      : `Welcome to the bot! 🎉\n\n`
    await sendMessage(token, chatId, `${intro}Pick a membership tier to unlock access:`, {
      reply_markup: tiersKeyboard(),
    })
    return
  }
  if (command === '/membership' || command === '/plans') {
    await sendMessage(token, chatId, 'Choose your membership tier:', { reply_markup: tiersKeyboard() })
    return
  }
  if (command === '/referral') {
    const code = `u${userId}`
    const link = `https://t.me/Generatetelecashbot?start=ref_${code}`
    await sendMessage(
      token,
      chatId,
      `Your referral link:\n<code>${link}</code>\n\nShare it — you earn <b>30%</b> on every membership purchased through your link.`,
    )
    return
  }
  if (command === '/help') {
    await sendMessage(token, chatId, `Commands:\n/start — get started\n/membership — view tiers\n/referral — get your link\n/help — this menu`)
    return
  }
  await sendMessage(token, chatId, `Unknown command. Try /help.`)
}

function planFromCallback(value: string | undefined): WhopPlanKey | null {
  if (value === 'tier:basic') return 'basic'
  if (value === 'tier:pro') return 'pro'
  if (value === 'tier:vip') return 'vip'
  return null
}

export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN
        if (!token) return new Response('Bot not configured', { status: 500 })

        const expected = deriveWebhookSecret(token)
        const actual = request.headers.get('x-telegram-bot-api-secret-token') ?? ''
        if (!safeEqual(actual, expected)) return new Response('Unauthorized', { status: 401 })

        let update: any
        try {
          update = await request.json()
        } catch {
          return new Response('Bad request', { status: 400 })
        }

        const msg = update.message ?? update.edited_message ?? update.channel_post
        const cb = update.callback_query
        const chatId: number | undefined = msg?.chat?.id ?? cb?.message?.chat?.id
        const userId: number | undefined = msg?.from?.id ?? cb?.from?.id
        const username: string | undefined = msg?.from?.username ?? cb?.from?.username
        const text: string | undefined = msg?.text ?? cb?.data
        const command = text && text.startsWith('/') ? text.split(/\s+/)[0].split('@')[0] : null
        const args = command && text ? text.slice(command.length).trim() : ''

        try {
          const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
          await supabaseAdmin.from('telegram_updates').upsert(
            {
              update_id: update.update_id,
              chat_id: chatId ?? null,
              user_id: userId ?? null,
              username: username ?? null,
              text: text ?? null,
              command,
              raw: update,
            },
            { onConflict: 'update_id' },
          )
        } catch (e) {
          console.error('log update failed', e)
        }

        try {
          if (cb) {
            const plan = planFromCallback(cb.data)
            if (plan && chatId) {
              const appUrl = (process.env.APP_URL || new URL(request.url).origin).replace(/\/$/, '')
              const checkout = await createWhopCheckout({
                planId: getWhopPlanId(plan),
                metadata: {
                  telegram_chat_id: String(chatId),
                  telegram_user_id: String(userId ?? ''),
                  telegram_username: username ?? '',
                  source: 'telegram-bot',
                  plan_key: plan,
                },
                redirectUrl: `${appUrl}/checkout/complete`,
              })

              const labels: Record<WhopPlanKey, string> = {
                basic: 'Basic — $5/mo',
                pro: 'Pro — $15/mo',
                vip: 'VIP — $30/mo',
              }
              await sendMessage(token, chatId, `You picked <b>${labels[plan]}</b>.\n\nTap below to complete your secure Whop payment:`, {
                reply_markup: {
                  inline_keyboard: [[{ text: '💳 Pay securely with Whop', url: checkout.purchaseUrl }]],
                },
              })
            }

            await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ callback_query_id: cb.id }),
            })
          } else if (command && chatId && userId) {
            await handleCommand(token, chatId, userId, username, command, args)
          }
        } catch (e) {
          console.error('handler error', e)
          if (cb?.message?.chat?.id) {
            await sendMessage(token, cb.message.chat.id, 'Sorry — checkout is temporarily unavailable. Please try again in a moment.')
          }
        }

        return Response.json({ ok: true })
      },
      GET: async () => Response.json({ ok: true, status: 'telegram webhook live' }),
      PUT: async ({ request }) => {
        const token = process.env.TELEGRAM_BOT_TOKEN
        if (!token) return new Response('Bot not configured', { status: 500 })
        const expected = deriveWebhookSecret(token)
        const key = request.headers.get('x-setup-key') ?? ''
        if (!safeEqual(key, expected)) return new Response('Unauthorized', { status: 401 })

        const body = await request.json().catch(() => ({}))
        const action = (body as any).action ?? 'set'
        const url = (body as any).url as string | undefined

        if (action === 'info') {
          const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
          return Response.json(await r.json())
        }
        if (action === 'delete') {
          const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, { method: 'POST' })
          return Response.json(await r.json())
        }
        if (!url) return Response.json({ error: 'url required' }, { status: 400 })
        const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url,
            secret_token: expected,
            allowed_updates: ['message', 'edited_message', 'callback_query'],
            drop_pending_updates: true,
          }),
        })
        return Response.json(await r.json())
      },
    },
  },
})
