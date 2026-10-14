// Telecast Telegram webhook: @Generatetelecashtbot
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || 'Generatetelecashtbot';

const PRODUCTS = {
  starter: { name: 'AI Side Hustle Starter', price: 'price_1U6O7kLxVPbmfNicqtQhbzSX', mode: 'payment' },
  hub: { name: 'AI Side Hustle Hub', price: 'price_1U6O7oLxVPbmfNicsqqvSHLR', mode: 'subscription' },
  vault: { name: 'Creator Business Vault', price: 'price_1U6O7sLxVPbmfNicpiI3MRlN', mode: 'subscription' },
};

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Telegram ${method} failed: ${await response.text()}`);
  return response.json();
}

async function sendMessage(chatId, text, reply_markup) {
  return telegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...(reply_markup ? { reply_markup } : {}) });
}

async function upsertUser(from, referrerCode = null) {
  const { data: existing } = await supabase.from('telegram_users').select('*').eq('telegram_id', from.id).maybeSingle();
  if (existing) return existing;
  let referrerId = null;
  if (referrerCode) {
    const { data: ref } = await supabase.from('telegram_users').select('id').eq('referral_code', referrerCode).maybeSingle();
    referrerId = ref?.id || null;
  }
  const { data, error } = await supabase.from('telegram_users').insert({
    telegram_id: from.id, username: from.username || null, first_name: from.first_name || null,
    referral_code: `tg${from.id}`, referred_by: referrerId,
  }).select('*').single();
  if (error) throw error;
  return data;
}

async function createCheckout(userId, productKey, referralCode) {
  const product = PRODUCTS[productKey];
  const session = await stripe.checkout.sessions.create({
    mode: product.mode,
    line_items: [{ price: product.price, quantity: 1 }],
    customer_creation: product.mode === 'payment' ? 'always' : undefined,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    metadata: { telegram_user_id: String(userId), product_key: productKey, referral_code: referralCode || '' },
    subscription_data: product.mode === 'subscription' ? { metadata: { telegram_user_id: String(userId), product_key: productKey, referral_code: referralCode || '' } } : undefined,
    success_url: `https://t.me/${BOT_USERNAME}?start=paid_{CHECKOUT_SESSION_ID}`,
    cancel_url: `https://t.me/${BOT_USERNAME}?start=cancelled`,
  });
  await supabase.from('checkout_sessions').upsert({
    stripe_session_id: session.id, telegram_user_id: userId, product_key: productKey,
    referral_code: referralCode || null, status: 'created',
  }, { onConflict: 'stripe_session_id' });
  return session.url;
}

function productsKeyboard() {
  return { inline_keyboard: [
    [{ text: '🚀 AI Side Hustle Starter — A$9', callback_data: 'buy:starter' }],
    [{ text: '💎 AI Side Hustle Hub — A$19/mo', callback_data: 'buy:hub' }],
    [{ text: '🔐 Creator Business Vault — A$49/mo', callback_data: 'buy:vault' }],
    [{ text: '👥 My referral link', callback_data: 'referral' }],
  ] };
}

async function sendAccess(chatId, telegramId) {
  const { data } = await supabase.from('telecast_entitlements').select('product_key,active,expires_at').eq('telegram_user_id', telegramId).eq('active', true);
  if (!data?.length) return sendMessage(chatId, '🔒 You do not have active paid access yet. Tap /products to choose an offer.');
  return sendMessage(chatId, `🔓 <b>Your active access</b>\n\n${data.map(x => `• ${PRODUCTS[x.product_key]?.name || x.product_key}`).join('\n')}\n\nYour private member resources are available to active members.`);
}

async function handleUpdate(update) {
  if (update.callback_query) {
    const q = update.callback_query;
    await telegram('answerCallbackQuery', { callback_query_id: q.id });
    const chatId = q.message.chat.id;
    const user = await upsertUser(q.from);
    if (q.data === 'products') return sendMessage(chatId, '<b>Choose your access:</b>\n\nStripe securely handles payment. Access is unlocked only after Stripe confirms the purchase.', productsKeyboard());
    if (q.data === 'access') return sendAccess(chatId, user.telegram_id);
    if (q.data === 'referral') return sendMessage(chatId, `👥 <b>Your referral link</b>\n\nhttps://t.me/${BOT_USERNAME}?start=ref_${user.referral_code}`);
    if (q.data.startsWith('buy:')) {
      const key = q.data.split(':')[1];
      if (!PRODUCTS[key]) return;
      const url = await createCheckout(user.telegram_id, key, user.referral_code);
      return sendMessage(chatId, `🔒 <b>${PRODUCTS[key].name}</b>\n\nTap below to pay securely with Stripe.`, { inline_keyboard: [[{ text: '💳 Secure Stripe Checkout', url }], [{ text: '⬅️ Back to products', callback_data: 'products' }]] });
    }
    return;
  }

  const message = update.message;
  if (!message?.chat) return;
  const chatId = message.chat.id;
  const text = message.text || '';
  const [command, arg] = text.trim().split(/\s+/, 2);
  const referrerCode = arg?.startsWith('ref_') ? arg.slice(4) : null;
  const user = await upsertUser(message.from, referrerCode);

  if (command === '/start') {
    if (arg?.startsWith('paid_')) {
      try {
        const session = await stripe.checkout.sessions.retrieve(arg.slice(5));
        if (session.payment_status === 'paid' && session.metadata.telegram_user_id === String(user.telegram_id)) {
          await sendMessage(chatId, '✅ <b>Payment confirmed.</b> Your access is unlocked.');
          return sendAccess(chatId, user.telegram_id);
        }
        return sendMessage(chatId, '⏳ Payment is not confirmed yet. Please wait a moment and use /access again.');
      } catch {
        return sendMessage(chatId, 'I could not verify that checkout session. Please use the original Stripe checkout button.');
      }
    }
    if (arg === 'cancelled') return sendMessage(chatId, 'No worries — checkout was cancelled. Use /products whenever you are ready.');
    return sendMessage(chatId, `👋 <b>Welcome to Telecast.</b>\n\nMemberships + digital products for building smarter online income.\n\nChoose an offer below.`, { inline_keyboard: [[{ text: '🛍 View products', callback_data: 'products' }], [{ text: '👥 Referral programme', callback_data: 'referral' }], [{ text: '🔐 Check my access', callback_data: 'access' }]] });
  }
  if (command === '/products' || command === '/shop') return sendMessage(chatId, '<b>Choose your access:</b>\n\nEverything is delivered after Stripe confirms payment.', productsKeyboard());
  if (command === '/referral') return sendMessage(chatId, `👥 <b>Your referral link</b>\n\nhttps://t.me/${BOT_USERNAME}?start=ref_${user.referral_code}`);
  if (command === '/access') return sendAccess(chatId, user.telegram_id);
  if (command === '/help') return sendMessage(chatId, '<b>Commands</b>\n/start — welcome\n/products — view offers\n/access — check paid access\n/referral — get your referral link\n/help — help');
  return sendMessage(chatId, 'Use /products to see the current offers.');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, service: 'telecast-telegram' });
  try { await handleUpdate(req.body); return res.status(200).json({ ok: true }); }
  catch (error) { console.error(error); return res.status(500).json({ ok: false }); }
}
