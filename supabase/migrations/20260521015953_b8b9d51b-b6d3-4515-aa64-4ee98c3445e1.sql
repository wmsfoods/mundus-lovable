CREATE TABLE public.negotiation_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES public.negotiations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  supplier_email TEXT,
  supplier_name TEXT,
  is_used BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

CREATE INDEX idx_negotiation_tokens_token ON public.negotiation_tokens(token);
CREATE INDEX idx_negotiation_tokens_neg ON public.negotiation_tokens(negotiation_id);

ALTER TABLE public.negotiation_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read by token"
  ON public.negotiation_tokens FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert tokens"
  ON public.negotiation_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update tokens"
  ON public.negotiation_tokens FOR UPDATE
  USING (true);