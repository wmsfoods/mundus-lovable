# Plano — Logo nos emails + Fases 2 e 3

## Etapa A — Logo no topo de todos os emails (imediato)

Substituir o bloco "ícone + texto Mundus / TRADE" do header dos templates por **uma única imagem** (o logo horizontal completo já em PNG transparente) e padronizar o **favicon** (ícone quadrado arredondado) como ícone de fallback / uso em locais pequenos.

1. Subir as duas imagens enviadas para a CDN da Lovable (assets imutáveis, URL pública estável, sem depender de bucket público do Supabase):
   - `mundus-logo-email-full.png` — logo horizontal com texto, fundo transparente (a usar no header dos emails)
   - `mundus-logo-email-icon.png` — ícone quadrado arredondado, fundo transparente (fallback / dark-mode / footer)
2. Criar `src/lib/email/brandAssets.ts` exportando as URLs absolutas dos dois PNGs (emails precisam de URL absoluta, não relativa).
3. Atualizar o header de TODOS os templates atuais em `src/lib/emailTemplates.ts` (19 templates) e em `src/lib/email/welcomeRender.ts`:
   - Trocar o `<img favicon 36x36> + <span>Mundus</span><span>TRADE</span>` por **um único `<img>` do logo horizontal**, altura ~32px, `alt="Mundus Trade"`, centralizado/à esquerda mantendo o padding atual.
   - Manter o gradiente do hero abaixo do header e o resto do layout intacto.
4. Atualizar o default do campo editável `logoUrl` do template `welcome` (e do schema das definitions) para apontar para o **logo horizontal** novo, mantendo retrocompatibilidade: se `logoUrl` salvo no DB ainda for o antigo, continua funcionando.
5. Atualizar o preview iframe do editor (`EmailTemplateEditor.tsx`) — nenhum código novo, só herda do render.

Resultado: todos os emails enviados (com ou sem override do admin) passam a mostrar o **logo PNG transparente** no topo, sem o texto duplicado.

## Etapa B — Fase 2: editor para os 18 templates restantes

Modelo mecânico, replicando o pattern do `welcome`:

1. **Migration de definitions** — inserir as 18 linhas restantes em `email_template_definitions` extraindo campos editáveis de cada template do `notificationsCatalog.ts`:
   - Padrão de campos por template: `subject`, `preheader`, `heroTitle`, `greeting`, `intro`, blocos específicos (`detailsTitle`, `noteBox`, etc), `ctaLabel`, `ctaUrl`, `primaryColor`, `logoUrl`.
   - Variáveis disponíveis por template extraídas direto da assinatura das funções em `emailTemplates.ts`.
   - PT inicial = tradução das strings hardcoded; EN = strings atuais.
2. **Render genérico** — criar `src/lib/email/genericRender.ts` parametrizado por `template_key`, evitando 18 arquivos `xRender.ts`. Layout único (mesmo wrapper do welcome, com header de logo da Etapa A) + lista de seções configuráveis (parágrafos, "details card", CTA). Cada template aponta para seu conjunto de seções via metadata na definition (campo novo `layout_sections: jsonb`).
3. **Resolver** — ampliar `SUPPORTED` em `templateOverrideResolver.ts` para incluir todos os 19, roteando para `genericRender` (welcome continua no seu render dedicado por enquanto, ou migra também).
4. **UI** — o `EmailTemplateEditor.tsx` já é genérico (lê `editable_fields`), então só remover o gate `if (templateKey === "welcome")` do botão "Editar email" em `NotificationsDocument.tsx`.
5. **Fallback** — se algum template não tiver override ativo, continua usando o código de `emailTemplates.ts` (que já foi atualizado na Etapa A para o novo logo).

## Etapa C — Fase 3: teste + upload de logo + locale

1. **Botão "Enviar teste"** no `EmailTemplateEditor`:
   - Campo de email (default: email do admin logado).
   - Renderiza o template **com os valores do editor não salvos** + dados de exemplo das variáveis.
   - Chama uma nova edge function `send-template-test` (service role) que enfileira em `email_queue` com `subject` prefixado `[TEST] ` e o HTML renderizado.
2. **Upload de logo por template**:
   - Criar bucket `email-assets` público (migration + policy `Public read`).
   - Componente `TemplateLogoUploader` que faz upload pra `email-assets/templates/{template_key}/{uuid}.png`, salva URL pública no campo `logoUrl`.
   - Processar via `processLogo()` existente (transparência + crop + padding) antes do upload.
3. **Locale por destinatário**:
   - Adicionar coluna `preferred_locale` em `users` (`pt` | `en`, default `en`).
   - `emailSender.queueOne` lê locale do destinatário via lookup em `users` por `recipientEmail` (com fallback para `en`).
   - Atualizar `tryRenderWithOverrides` para receber locale dinâmico (já aceita o parâmetro, só faltava o lookup).
   - UI de preferência no `NotificationPreferences.tsx` (toggle PT/EN).

## Detalhes técnicos

```text
Header novo (todos os templates):
┌────────────────────────────────────────────┐
│   [Logo Mundus Trade PNG transparente]     │   <- height 32px, padding 20px 32px
├────────────────────────────────────────────┤
│   [Hero gradient + heroTitle]              │
└────────────────────────────────────────────┘
```

Arquivos principais tocados:
- **Etapa A**: `src/lib/email/brandAssets.ts` (novo), `src/lib/emailTemplates.ts`, `src/lib/email/welcomeRender.ts`, migration para atualizar default de `logoUrl` em `email_template_definitions`.
- **Etapa B**: migration popula 18 definitions + adiciona coluna `layout_sections`; novo `src/lib/email/genericRender.ts`; ajuste no resolver e no `NotificationsDocument.tsx`.
- **Etapa C**: nova edge function `send-template-test`; migration cria bucket `email-assets` + coluna `users.preferred_locale`; novo componente `TemplateLogoUploader.tsx`; ajustes em `emailSender.ts`, `templateOverrideResolver.ts`, `NotificationPreferences.tsx`.

## Ordem de entrega sugerida

1. Etapa A (rápida, melhora visual imediato em tudo) — entrego e você valida.
2. Etapa B em sequência (volume, mas mecânico).
3. Etapa C por último (toca infra: bucket + edge function + schema de users).

## Fora de escopo

- Editor WYSIWYG de layout livre.
- A/B testing, agendamento.
- Templates de auth (Supabase) — fluxo separado.
