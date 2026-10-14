CREATE TABLE IF NOT EXISTS public.whop_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whop_payments (
  payment_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  order_id TEXT,
  plan_id TEXT,
  member_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),
  amount NUMERIC,
  amount_after_fees NUMERIC,
  currency TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whop_payments_order_id ON public.whop_payments(order_id);
CREATE INDEX IF NOT EXISTS idx_whop_payments_status ON public.whop_payments(status);
CREATE INDEX IF NOT EXISTS idx_whop_payments_plan_id ON public.whop_payments(plan_id);
CREATE INDEX IF NOT EXISTS idx_whop_payments_created_at ON public.whop_payments(created_at DESC);

ALTER TABLE public.whop_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whop_payments ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.whop_webhook_events TO service_role;
GRANT ALL ON public.whop_payments TO service_role;

CREATE OR REPLACE FUNCTION public.set_whop_payment_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS whop_payments_updated_at ON public.whop_payments;
CREATE TRIGGER whop_payments_updated_at
BEFORE UPDATE ON public.whop_payments
FOR EACH ROW EXECUTE FUNCTION public.set_whop_payment_updated_at();

COMMENT ON TABLE public.whop_webhook_events IS 'Idempotency and audit log for verified Whop webhook events';
COMMENT ON TABLE public.whop_payments IS 'Verified Whop payment records used for revenue and fulfillment';
