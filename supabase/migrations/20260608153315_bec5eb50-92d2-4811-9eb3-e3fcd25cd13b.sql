
CREATE TABLE public.email_template_definitions (
  template_key text PRIMARY KEY,
  name_pt text NOT NULL,
  name_en text NOT NULL,
  description_pt text,
  description_en text,
  category text NOT NULL DEFAULT 'transactional',
  hero_color text NOT NULL DEFAULT 'wine',
  editable_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  variables jsonb NOT NULL DEFAULT '[]'::jsonb,
  defaults_pt jsonb NOT NULL DEFAULT '{}'::jsonb,
  defaults_en jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_template_definitions TO authenticated;
GRANT ALL ON public.email_template_definitions TO service_role;
ALTER TABLE public.email_template_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read defs" ON public.email_template_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write defs" ON public.email_template_definitions FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

CREATE TABLE public.email_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text NOT NULL REFERENCES public.email_template_definitions(template_key) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt','en')),
  version_number int NOT NULL,
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (template_key, locale, version_number)
);
CREATE INDEX idx_etv_key_locale ON public.email_template_versions(template_key, locale, version_number DESC);
GRANT SELECT ON public.email_template_versions TO authenticated;
GRANT ALL ON public.email_template_versions TO service_role;
ALTER TABLE public.email_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read versions" ON public.email_template_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write versions" ON public.email_template_versions FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

CREATE TABLE public.email_template_active (
  template_key text NOT NULL REFERENCES public.email_template_definitions(template_key) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('pt','en')),
  version_id uuid NOT NULL REFERENCES public.email_template_versions(id) ON DELETE CASCADE,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_key, locale)
);
GRANT SELECT ON public.email_template_active TO authenticated;
GRANT ALL ON public.email_template_active TO service_role;
ALTER TABLE public.email_template_active ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read active" ON public.email_template_active FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin write active" ON public.email_template_active FOR ALL TO authenticated
  USING (public.is_mundus_admin()) WITH CHECK (public.is_mundus_admin());

CREATE OR REPLACE FUNCTION public.email_tpl_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER trg_etd_touch BEFORE UPDATE ON public.email_template_definitions
  FOR EACH ROW EXECUTE FUNCTION public.email_tpl_touch_updated_at();
CREATE TRIGGER trg_eta_touch BEFORE UPDATE ON public.email_template_active
  FOR EACH ROW EXECUTE FUNCTION public.email_tpl_touch_updated_at();

INSERT INTO public.email_template_definitions (
  template_key, name_pt, name_en, description_pt, description_en, category, hero_color,
  editable_fields, variables, defaults_pt, defaults_en
) VALUES (
  'welcome','Boas-vindas','Welcome',
  'Email enviado logo após o cadastro de um novo usuário.',
  'Sent right after a new user signs up.',
  'auth','wine',
  jsonb_build_array(
    jsonb_build_object('key','subject','label','Assunto','type','text','maxLength',120),
    jsonb_build_object('key','preheader','label','Preheader (linha de preview)','type','text','maxLength',160),
    jsonb_build_object('key','heroTitle','label','Título no banner','type','text','maxLength',80),
    jsonb_build_object('key','greeting','label','Saudação','type','text','maxLength',80),
    jsonb_build_object('key','intro','label','Parágrafo de introdução','type','textarea','maxLength',400),
    jsonb_build_object('key','nextStepsTitle','label','Título "próximos passos"','type','text','maxLength',80),
    jsonb_build_object('key','step1','label','Passo 1','type','text','maxLength',120),
    jsonb_build_object('key','step2','label','Passo 2','type','text','maxLength',120),
    jsonb_build_object('key','step3','label','Passo 3','type','text','maxLength',120),
    jsonb_build_object('key','step4','label','Passo 4','type','text','maxLength',120),
    jsonb_build_object('key','ctaLabel','label','Texto do botão','type','text','maxLength',40),
    jsonb_build_object('key','ctaUrl','label','URL do botão','type','text','maxLength',300),
    jsonb_build_object('key','primaryColor','label','Cor primária (CTA + destaques)','type','color'),
    jsonb_build_object('key','logoUrl','label','URL do logo (cabeçalho)','type','image')
  ),
  jsonb_build_array(
    jsonb_build_object('key','name','label','Nome do usuário','sample','Maria Silva'),
    jsonb_build_object('key','company','label','Empresa','sample','Friboi Exports'),
    jsonb_build_object('key','email','label','Email','sample','maria@friboi.com'),
    jsonb_build_object('key','role','label','Papel','sample','Supplier'),
    jsonb_build_object('key','country','label','País','sample','Brazil'),
    jsonb_build_object('key','countryFlag','label','Bandeira','sample','🇧🇷')
  ),
  jsonb_build_object(
    'subject','Bem-vindo(a) à Mundus Trade 🎉',
    'preheader','Bem-vindo(a) {{name}}! Sua conta na Mundus Trade está pronta.',
    'heroTitle','Bem-vindo(a) à Mundus Trade 🎉',
    'greeting','Olá {{name}},',
    'intro','Sua conta foi criada com sucesso. Agora você faz parte da rede global de comércio de proteínas.',
    'nextStepsTitle','O que fazer a seguir:',
    'step1','✅ Complete o perfil da sua empresa',
    'step2','✅ Configure suas preferências de proteínas',
    'step3','✅ Explore o marketplace',
    'step4','✅ Crie sua primeira oferta/requisição',
    'ctaLabel','Começar →',
    'ctaUrl','https://app.mundustrade.us',
    'primaryColor','#8B2252',
    'logoUrl','https://app.mundustrade.us/favicon.png'
  ),
  jsonb_build_object(
    'subject','Welcome to Mundus Trade 🎉',
    'preheader','Welcome {{name}}! Your account on Mundus Trade is ready.',
    'heroTitle','Welcome to Mundus Trade 🎉',
    'greeting','Hi {{name}},',
    'intro','Your account has been created successfully. You''re now part of the global protein trading network.',
    'nextStepsTitle','Here''s what you can do next:',
    'step1','✅ Complete your company profile',
    'step2','✅ Set your protein preferences',
    'step3','✅ Browse the marketplace',
    'step4','✅ Create your first offer/request',
    'ctaLabel','Get Started →',
    'ctaUrl','https://app.mundustrade.us',
    'primaryColor','#8B2252',
    'logoUrl','https://app.mundustrade.us/favicon.png'
  )
);
