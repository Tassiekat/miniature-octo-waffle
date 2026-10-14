# Telecast Telegram + Stripe

This repo now contains the backend for the Telegram bot shown in the screenshot: `@Generatetelecashtbot`.

## Products

| Key | Product | Stripe price | Billing |
|---|---|---|---|
| `starter` | AI Side Hustle Starter | `price_1U6O7kLxVPbmfNicqtQhbzSX` | A$9 one-time |
| `hub` | AI Side Hustle Hub | `price_1U6O7oLxVPbmfNicsqqvSHLR` | A$19/month |
| `vault` | Creator Business Vault | `price_1U6O7sLxVPbmfNicpiI3MRlN` | A$49/month |

The Stripe products/prices are currently in **test mode**. Do not advertise the test checkout URLs as live payment links.

## Bot flow

1. User opens the bot and taps **View products**.
2. The bot creates a Stripe-hosted Checkout Session tied to that Telegram user ID.
3. Stripe completes payment/subscription.
4. `api/stripe-webhook.js` verifies the Stripe signature and creates/updates the entitlement.
5. The bot sends a confirmation and `/access` shows the active entitlement.
6. Referral links use Telegram deep links such as `start=ref_CODE`; the code is copied into Stripe metadata and stored with the completed sale.

## Required Vercel environment variables

- `TELEGRAM_BOT_TOKEN` — token from BotFather. Never commit this.
- `TELEGRAM_BOT_USERNAME` — bot username without `@`.
- `TELEGRAM_SETUP_SECRET` — random secret used to authorize the webhook setup endpoint.
- `APP_URL` — production HTTPS URL for this deployment.
- `STRIPE_SECRET_KEY` — Stripe secret key for the same mode as the prices.
- `STRIPE_WEBHOOK_SECRET` — signing secret for `/api/stripe-webhook`.
- `SUPABASE_URL` — Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service-role key. Server-only; never expose it to a browser.

## Supabase

Run `supabase/telegram_bot.sql` once in the Supabase SQL editor. Telegram uses `telecast_entitlements`; the storefront's existing `entitlements` table is preserved. These Telegram tables are server-only with RLS enabled and no browser-role access.

## Telegram webhook

After deployment, call `POST /api/telegram-setup` with header:

`Authorization: Bearer YOUR_TELEGRAM_SETUP_SECRET`

The endpoint sets the Telegram webhook to `/api/telegram` and installs the bot command menu.

## Stripe webhook

Create a Stripe webhook endpoint pointing to:

`https://YOUR-DOMAIN/api/stripe-webhook`

Subscribe to:

- `checkout.session.completed`
- `customer.subscription.deleted`
- `customer.subscription.paused`
- `invoice.payment_failed`

Use the signing secret Stripe gives you as `STRIPE_WEBHOOK_SECRET`.

## Important

The webhook is the source of truth for paid access. The success redirect is only a convenience for returning the buyer to Telegram; it must never be used by itself to grant access.

## Routing verification

Vercel filesystem functions are matched before the API fallback rewrite. Keep `/api/telegram`, `/api/telegram-setup`, and `/api/stripe-webhook` as standalone functions. Check GET responses after deployment: Telegram returns its health JSON; setup and Stripe return 405. A 500 requires checking runtime logs and server environment configuration, not assuming a rewrite failure.
