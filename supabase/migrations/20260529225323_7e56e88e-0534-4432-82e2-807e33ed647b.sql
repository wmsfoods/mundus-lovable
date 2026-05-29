CREATE TABLE public.payment_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'international' CHECK (scope IN ('international','usa_domestic')),
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_terms TO anon;
GRANT SELECT ON public.payment_terms TO authenticated;
GRANT ALL ON public.payment_terms TO service_role;

ALTER TABLE public.payment_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_terms readable by all"
  ON public.payment_terms FOR SELECT
  USING (true);

CREATE POLICY "payment_terms admin insert"
  ON public.payment_terms FOR INSERT
  WITH CHECK (public.is_mundus_admin());

CREATE POLICY "payment_terms admin update"
  ON public.payment_terms FOR UPDATE
  USING (public.is_mundus_admin());

CREATE POLICY "payment_terms admin delete"
  ON public.payment_terms FOR DELETE
  USING (public.is_mundus_admin());

CREATE TRIGGER trg_payment_terms_updated_at
  BEFORE UPDATE ON public.payment_terms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.payment_terms (label, scope, sort_order) VALUES
  ('100% TT', 'international', 10),
  ('100% Advance', 'international', 20),
  ('100% LC at Sight', 'international', 30),
  ('100% CAD', 'international', 40),
  ('10% Advance, Balance TT', 'international', 50),
  ('20% Advance, Balance TT', 'international', 60),
  ('25% Advance, Balance TT', 'international', 70),
  ('30% Advance, Balance TT', 'international', 80),
  ('40% Advance, Balance TT', 'international', 90),
  ('50% Advance, Balance TT', 'international', 100),
  ('60% Advance, Balance TT', 'international', 110),
  ('10% Advance, Balance 7 Days TIS', 'usa_domestic', 10),
  ('20% Advance, Balance 7 Days TIS', 'usa_domestic', 20),
  ('30% Advance, Balance 7 Days TIS', 'usa_domestic', 30),
  ('40% Advance, Balance 7 Days TIS', 'usa_domestic', 40),
  ('50% Advance, Balance 7 Days TIS', 'usa_domestic', 50),
  ('10% Advance, Balance 14 Days TIS', 'usa_domestic', 60),
  ('20% Advance, Balance 14 Days TIS', 'usa_domestic', 70),
  ('30% Advance, Balance 14 Days TIS', 'usa_domestic', 80),
  ('40% Advance, Balance 14 Days TIS', 'usa_domestic', 90),
  ('50% Advance, Balance 14 Days TIS', 'usa_domestic', 100),
  ('7 Net', 'usa_domestic', 200),
  ('14 Net', 'usa_domestic', 210),
  ('15 Net', 'usa_domestic', 220),
  ('21 Net', 'usa_domestic', 230),
  ('30 Net', 'usa_domestic', 240),
  ('Due on Receipt', 'usa_domestic', 300);