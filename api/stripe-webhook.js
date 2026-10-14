import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PRODUCTS = {
  starter: { name: 'AI Side Hustle Starter' },
  hub: { name: 'AI Side Hustle Hub' },
  vault: { name: 'Creator Business Vault' },
};

async function telegram(method, body) {
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!r.ok) console.error(await r.text());
}

export const config = { api: { bodyParser: false } };
async function rawBody(req) { const chunks = []; for await (const chunk of req) chunks.push(chunk); return Buffer.concat(chunks); }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const raw = await rawBody(req);
  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const telegramUserId = Number(session.metadata?.telegram_user_id);
      const productKey = session.metadata?.product_key;
      if (telegramUserId && productKey) {
        await supabase.from('telecast_entitlements').upsert({
          telegram_user_id: telegramUserId,
          product_key: productKey,
          stripe_customer_id: session.customer || null,
          stripe_subscription_id: session.subscription || null,
          stripe_session_id: session.id,
          active: session.mode === 'subscription' || session.payment_status === 'paid',
        }, { onConflict: 'telegram_user_id,product_key' });
        await supabase.from('checkout_sessions').update({ status: 'completed' }).eq('stripe_session_id', session.id);
        if (session.metadata.referral_code) {
          await supabase.from('referrals').upsert({ referral_code: session.metadata.referral_code, buyer_telegram_id: telegramUserId, product_key: productKey, stripe_session_id: session.id }, { onConflict: 'stripe_session_id' });
        }
        await telegram('sendMessage', {
          chat_id: telegramUserId,
          text: `🎉 <b>Payment confirmed!</b>\n\nYour <b>${PRODUCTS[productKey]?.name || productKey}</b> access is now active.\n\nUse /access any time to check your membership.`,
          parse_mode: 'HTML',
        });
      }
    }

    if (event.type === 'customer.subscription.deleted' || event.type === 'customer.subscription.paused') {
      const sub = event.data.object;
      await supabase.from('telecast_entitlements').update({ active: false }).eq('stripe_subscription_id', sub.id);
    }

    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const { data } = await supabase.from('telecast_entitlements').select('telegram_user_id').eq('stripe_customer_id', invoice.customer).eq('active', true).maybeSingle();
      if (data?.telegram_user_id) {
        await telegram('sendMessage', {
          chat_id: data.telegram_user_id,
          text: '⚠️ Your membership payment failed. Stripe will retry automatically. Please update your payment method so your access stays active.',
        });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ received: false });
  }
  return res.status(200).json({ received: true });
}
