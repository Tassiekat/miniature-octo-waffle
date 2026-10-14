CREATE TABLE IF NOT EXISTS public.membership_entitlements (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('whop', 'stripe')),
  membership_id TEXT,
  plan_id TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro', 'vip')),
  status TEXT NOT NULL CHECK (status IN ('active', 'past_due', 'inactive', 'canceled')) DEFAULT 'active',
  source_payment_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_membership_entitlements_membership_id
  ON public.membership_entitlements(membership_id)
  WHERE membership_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_membership_entitlements_plan_id
  ON public.membership_entitlements(plan_id);

CREATE INDEX IF NOT EXISTS idx_membership_entitlements_status
  ON public.membership_entitlements(status);

ALTER TABLE public.membership_entitlements ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.membership_entitlements TO service_role;

DROP POLICY IF EXISTS "users can read their own membership" ON public.membership_entitlements;
CREATE POLICY "users can read their own membership"
  ON public.membership_entitlements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_membership_entitlement_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS membership_entitlements_updated_at ON public.membership_entitlements;
CREATE TRIGGER membership_entitlements_updated_at
BEFORE UPDATE ON public.membership_entitlements
FOR EACH ROW EXECUTE FUNCTION public.set_membership_entitlement_updated_at();
