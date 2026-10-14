CREATE TABLE IF NOT EXISTS public.stripe_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stripe_payments (
  payment_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  checkout_session_id TEXT,
  order_id TEXT,
  plan_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  amount BIGINT,
  currency TEXT,
  customer_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stripe_payments_order_id ON public.stripe_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_status ON public.stripe_payments(status);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_checkout_session ON public.stripe_payments(checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payments_created_at ON public.stripe_payments(created_at DESC);

ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_payments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stripe_webhook_events TO service_role;
GRANT ALL ON public.stripe_payments TO service_role;

CREATE OR REPLACE FUNCTION public.set_stripe_payment_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stripe_payments_updated_at ON public.stripe_payments;
CREATE TRIGGER stripe_payments_updated_at
BEFORE UPDATE ON public.stripe_payments
FOR EACH ROW EXECUTE FUNCTION public.set_stripe_payment_updated_at();
