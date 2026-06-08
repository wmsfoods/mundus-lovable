
# Editor de Emails no Admin

Transformar os 19 templates de `src/lib/emailTemplates.ts` (hoje fixos em código) em templates editáveis pelo painel Admin, mantendo o layout/HTML estável e expondo apenas os campos seguros: textos, assunto, cores, logo, CTA. Idiomas PT e EN editáveis separados. Histórico de versões com revert.

## O que muda para o usuário

- **Admin → Docs → 🔔 Emails & Notifications → Catálogo**: cada card de template ganha botão **"Editar"**.
- Tela de edição abre com:
  - Abas **PT / EN**.
  - Campos de texto: assunto, preheader, título, parágrafos, label do CTA.
  - Campos visuais: cor primária, cor do botão, logo (upload).
  - Painel lateral com **variáveis disponíveis** (`{{buyerName}}`, `{{offerNumber}}`, etc.) — clique insere no campo focado.
  - **Preview ao vivo** (iframe) usando dados de exemplo.
- Botões: **Salvar nova versão**, **Reverter para…** (dropdown com histórico), **Restaurar padrão de fábrica**.
- Botão **"Enviar teste"** para o email do admin logado.

## Arquitetura

### Banco (Lovable Cloud)

Três tabelas novas:

```text
email_template_definitions    (read-only — fonte de verdade dos campos editáveis por template)
  id, template_key, name, description, category,
  editable_fields jsonb,  -- schema: [{key,label,type:'text|textarea|color|image|cta',default_pt,default_en}]
  variables jsonb,        -- [{key,label,sample_pt,sample_en}]
  created_at

email_template_versions       (histórico append-only)
  id, template_key, locale ('pt'|'en'),
  values jsonb,           -- { subject, preheader, title, body1, ctaLabel, primaryColor, logoUrl, ... }
  version_number, created_by, created_at, notes

email_template_active         (ponteiro versão ativa por template+locale)
  template_key, locale, version_id, updated_by, updated_at
  PRIMARY KEY (template_key, locale)
```

Todas com GRANTs + RLS: leitura para `authenticated`, escrita só para admins (`has_role(auth.uid(),'admin')`). Bucket `email-assets` (público) para logos/banners.

### Render

`src/lib/emailTemplates.ts` permanece como **fallback de fábrica** (defaults). Novo módulo `src/lib/email/renderTemplate.ts`:

1. Busca versão ativa do banco (`email_template_active` → `email_template_versions`).
2. Se existir, monta HTML usando o **layout fixo** do template + valores editados (mesma estrutura visual de hoje, só substituindo strings/cores).
3. Se não existir, cai no template fixo atual.
4. Interpola `{{variaveis}}` via `templateEngine.renderTemplate` já existente.

Cache em memória (TTL 60s) para evitar hit no banco a cada envio. Invalidação por evento Realtime quando admin salva.

Edge function `send-email` recebe a mesma chamada de hoje; só muda a fonte do HTML.

### UI Admin

Novos arquivos:

```text
src/pages/admin/EmailTemplateEditor.tsx           (tela de edição)
src/components/admin/email/TemplateFieldEditor.tsx (campos por tipo)
src/components/admin/email/TemplateVariablePanel.tsx
src/components/admin/email/TemplateVersionHistory.tsx
src/components/admin/email/TemplatePreviewFrame.tsx
src/hooks/useEmailTemplateDefinition.ts
src/hooks/useEmailTemplateVersions.ts
src/hooks/useSaveEmailTemplate.ts
```

Card atual em `NotificationsDocument.tsx` ganha botão "Editar" que navega para `/admin/emails/:templateKey`. Rota adicionada em `App.tsx` (admin-only).

### Seeds

Migration popula `email_template_definitions` com os 19 templates de `notificationsCatalog.ts` + extração automática dos campos editáveis (subject, títulos, parágrafos, cor primária `#9B2251`, logo padrão). Defaults PT e EN — para os 5 templates que hoje só existem em EN, vou gerar tradução PT inicial baseada no conteúdo atual.

## Fora deste escopo

- Editor WYSIWYG de HTML livre (recusado na pergunta).
- Edição de estrutura de layout (colunas, seções) — só textos/cores/imagens.
- A/B test, agendamento, segmentação.
- Edição dos templates de **auth** do Supabase (signup confirm, magic link) — esses ficam num segundo momento via `scaffold_auth_email_templates`.

## Entrega faseada (sugestão)

1. **Fase 1** (este passo): migrations + 1 template piloto end-to-end (`welcome`) com editor, preview, save, versionamento, revert e envio de teste.
2. **Fase 2**: aplicar o mesmo para os outros 18 templates (mecânico, mesmo editor).
3. **Fase 3**: traduções PT pendentes + page "Enviar broadcast de teste para QA".

Confirma esse plano? Se sim, começo pela Fase 1 (piloto com `welcome`) para você validar a experiência antes de eu propagar para todos.
