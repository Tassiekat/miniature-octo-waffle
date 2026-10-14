CREATE TABLE public.webhook_verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  endpoint TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  secret_configured BOOLEAN NOT NULL DEFAULT false,
  passed BOOLEAN NOT NULL DEFAULT false,
  checks_passed INTEGER NOT NULL DEFAULT 0,
  checks_failed INTEGER NOT NULL DEFAULT 0,
  summary TEXT NOT NULL DEFAULT '',
  checks JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX webhook_verification_runs_ran_at_idx ON public.webhook_verification_runs (ran_at DESC);

GRANT ALL ON public.webhook_verification_runs TO service_role;

ALTER TABLE public.webhook_verification_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages verification runs"
ON public.webhook_verification_runs
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);