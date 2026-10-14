CREATE TABLE public.telegram_updates (
  update_id BIGINT PRIMARY KEY,
  chat_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  username TEXT,
  text TEXT,
  command TEXT,
  raw JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT check_positive_ids CHECK (update_id > 0 AND chat_id > 0)
);

COMMENT ON TABLE public.telegram_updates IS 'Stores raw Telegram webhook updates for logging and debugging';
COMMENT ON COLUMN public.telegram_updates.raw IS 'Full Telegram update object as received from webhook';
COMMENT ON COLUMN public.telegram_updates.command IS 'Extracted Telegram command if applicable';

CREATE INDEX idx_telegram_updates_user_id ON public.telegram_updates(user_id);
CREATE INDEX idx_telegram_updates_chat_id ON public.telegram_updates(chat_id);
CREATE INDEX idx_telegram_updates_chat_id_created_at ON public.telegram_updates(chat_id, created_at DESC);
CREATE INDEX idx_telegram_updates_created_at ON public.telegram_updates(created_at DESC);

GRANT ALL ON public.telegram_updates TO service_role;
ALTER TABLE public.telegram_updates ENABLE ROW LEVEL SECURITY;
-- No public policies: only the service role (webhook handler) reads/writes.
