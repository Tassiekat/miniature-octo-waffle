-- Reconcile Gen Earn Hub checkout persistence with the production database.

create table if not exists public.stripe_webhook_events (
  id text primary key,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists public.stripe_payments (
  payment_id text primary key,
  event_id text not null,
  checkout_session_id text,
  order_id text,
  plan_key text,
  status text not null check (status in ('pending', 'succeeded', 'failed')),
  amount bigint,
  currency text,
  customer_id text,
  metadata jsonb not null default '{}'::jsonb,
  event_type text not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stripe_payments_order_id
  on public.stripe_payments(order_id);
create index if not exists idx_stripe_payments_status
  on public.stripe_payments(status);
create index if not exists idx_stripe_payments_checkout_session
  on public.stripe_payments(checkout_session_id);
create index if not exists idx_stripe_payments_created_at
  on public.stripe_payments(created_at desc);

alter table public.stripe_webhook_events enable row level security;
alter table public.stripe_payments enable row level security;

grant all on public.stripe_webhook_events to service_role;
grant all on public.stripe_payments to service_role;
revoke all on public.stripe_webhook_events from anon, authenticated;
revoke all on public.stripe_payments from anon, authenticated;
revoke all on public.whop_webhook_events from anon, authenticated;
revoke all on public.whop_payments from anon, authenticated;
revoke all on public.vault_files from anon, authenticated;

create or replace function public.set_stripe_payment_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists stripe_payments_updated_at on public.stripe_payments;
create trigger stripe_payments_updated_at
before update on public.stripe_payments
for each row execute function public.set_stripe_payment_updated_at();

alter function public.set_membership_entitlement_updated_at()
  set search_path = public, pg_temp;

drop policy if exists "users can read their own membership"
  on public.membership_entitlements;
create policy "users can read their own membership"
  on public.membership_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "users can read their own vault entitlements"
  on public.vault_entitlements;
create policy "users can read their own vault entitlements"
  on public.vault_entitlements
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

comment on table public.stripe_webhook_events is
  'Idempotency log for verified Gen Earn Hub Stripe webhook events';
comment on table public.stripe_payments is
  'Verified Gen Earn Hub Stripe checkout payment records';
