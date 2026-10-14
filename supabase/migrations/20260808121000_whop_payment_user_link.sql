ALTER TABLE public.whop_payments
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_whop_payments_user_id
  ON public.whop_payments(user_id);
