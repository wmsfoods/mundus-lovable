
# Mundus Whats — módulo WhatsApp interno do Admin

Vou trazer o projeto **Zap_WmsFoods** para dentro do app Mundus como um sub-módulo do Admin chamado **Mundus Whats**, acessível apenas para usuários `mundus_admin` / `mundus_ops`. Mantenho todas as funcionalidades operacionais (atendimento, contatos, tarefas, macros, análises, configurações), removo as integrações com WMS Foods (Deals/CRM) e removo o agente IA "Andrew" — fica pronto para conectar um número de WhatsApp futuramente.

## Escopo funcional

Incluído:
- **Conversas** (lista + chat + detalhes da conversa, anexos, áudio, imagens, reações, edição de mensagem, busca, filtros, atribuição a agentes)
- **Contatos** (lista, edição, sincronização a partir do WhatsApp)
- **Tarefas** (criadas a partir da conversa, lembretes)
- **Macros** (respostas rápidas `/macro:nome`)
- **Análises** (relatório: volume, tempos de resposta, sentimentos, tópicos, top conversas)
- **Configurações**: Setup, Instâncias (Evolution API), Macros, Atribuição, Equipe, Segurança
- **Notificações** internas e banner de instância desconectada

Excluído (conforme pedido):
- Tudo de **WMS Deals** (sidebar de deals, hooks `useWmsDeals`, edge functions `fetch-wms-deals`, `agent-on-new-deal`, `andrew-deal-watcher`, `update-wms-customer-phone`, `fetch-wms-crm-contacts`)
- Tudo do **Andrew (IA)**: página `AndrewQueue`, sub-aba "Automação IA" em Configurações, cards de sentimento/sugestões geradas pelo Andrew, edge functions `agent-trader`, `agent-follow-up-scheduler`, `ai-auto-reply`, `ai-sequence-runner`, `andrew-deal-watcher`, `compose-whatsapp-message`, `suggest-smart-replies`, hooks `useAndrew*`, `useSmartReply`, `useAIAutomation`, `useAgentOutreach`
- CRM externo (Zoho/Claude assistant): `crm-zoho-sync`, `crm-claude-assistant`, `WmsCrm.tsx`, `TraderContacts.tsx`

Mantenho **categorização automática de conversa** e **resumo de IA** como features opcionais via Lovable AI Gateway (não dependem do Andrew). Se preferir cortar isso também, removo na fase 2.

## Estrutura na aplicação Mundus

Rotas novas, todas atrás de `RequireAuth` + check `is_mundus_admin`:

```text
/admin/whats                       → redireciona para /admin/whats/conversas
/admin/whats/conversas             → tela principal (lista + chat + detalhes)
/admin/whats/contatos              → contatos
/admin/whats/tarefas               → tarefas da equipe
/admin/whats/macros                → respostas rápidas
/admin/whats/analises              → relatório
/admin/whats/configuracoes/setup
/admin/whats/configuracoes/instancias
/admin/whats/configuracoes/macros
/admin/whats/configuracoes/atribuicao
/admin/whats/configuracoes/equipe
/admin/whats/configuracoes/seguranca
```

Item novo no sidebar do Admin (`AdminShell.tsx`), no grupo "Operations":  
**Mundus Whats** (ícone `MessageCircle`, com badge de não lidas vindo de `app_notifications` filtradas por tipo `whatsapp`).

## Branding

- Substituo a paleta original do Zap por tokens semânticos Mundus (`--p800`, `--g050`…) já definidos em `src/styles/mundus-*.css`.
- Logo "WhatsApp" do header é trocado por **"Mundus Whats"** com a tag estilo "WHATSAPP" usando `--p800` (mesmo padrão da tag Buyer/Supplier).
- Bubbles do chat: outgoing usa `--p800` (vinho Mundus) com texto branco; incoming usa `#fff` com borda `hsl(var(--border))` — equivale ao que já existe em `mundus-chat.css`.
- Áreas com gradiente vinho (header de Setup) reaproveitam `mundus-tech-header.css`.
- Mobile: usa o `MobileDrawer` + `BottomNav` do Mundus (não o `MobileBottomNav` do Zap).

## Banco de dados

Crio uma migration única `mundus_whats_init` com **prefixo `mw_`** em todas as tabelas para isolar do schema atual e evitar colisão:

Tabelas principais:
- `mw_instances` (evolution_api: nome, número, webhook, status)
- `mw_contacts` (jid, nome, phone, avatar, tags, owner_user_id, notas)
- `mw_conversations` (instance_id, contact_id, status `open|assigned|closed|archived`, assigned_to, last_message_at, unread_count, sentiment, topic_tags[])
- `mw_messages` (conversation_id, from_me, type, body, media_url, status, reply_to_id, edited_at, deleted_at)
- `mw_message_edits` (history)
- `mw_message_reactions`
- `mw_macros` (slug, body, scope)
- `mw_assignment_rules` (priority, criteria jsonb, target_user_id|team)
- `mw_conversation_notes`, `mw_conversation_tasks`, `mw_conversation_summaries`, `mw_conversation_topics`
- `mw_team_members` (user_id, role `admin|agent|viewer`, status)
- `mw_setup_progress` (user_id, steps jsonb)

Todas com:
1. `CREATE TABLE`
2. `GRANT` (apenas `authenticated` + `service_role`, sem `anon`)
3. `ENABLE RLS`
4. Policies — **acesso restrito a `is_mundus_admin()`** (reuso a função existente). Nada exposto fora do time Mundus.

Realtime habilitado em `mw_conversations`, `mw_messages`, `mw_message_reactions`.

Storage: bucket privado `mw-media` com policies escopadas por `auth.uid()` Mundus admin.

## Edge functions (deploy automático)

Trago e adapto, removendo qualquer referência a WMS/Andrew:
- `evolution-webhook` (recebe mensagens da Evolution API e grava em `mw_messages`)
- `send-whatsapp-message`
- `edit-whatsapp-message`
- `test-evolution-connection`, `test-instance-connection`, `check-instances-status`
- `sync-whatsapp-contacts`, `fix-contact-names`, `sync-contact-profiles`
- `analyze-whatsapp-sentiment`, `categorize-whatsapp-conversation`, `generate-conversation-summary` (usam Lovable AI Gateway com `google/gemini-2.5-flash`)
- `invite-team-member`, `ensure-user-profile`

URL do webhook exibida no card de instância passa a ser do projeto Mundus: `https://kypyqxicwbusadnlhnwe.supabase.co/functions/v1/mw-evolution-webhook`. Conectaremos ao número que comprarem depois.

## Segredos

Para a Evolution API ainda não temos número/credenciais. Cadastro placeholders quando você conectar:
- `EVOLUTION_API_URL`
- `EVOLUTION_API_KEY`

Lovable AI Gateway já está disponível, não precisa de API key.

## Plano de execução (em fases dentro deste build)

1. **Migration**: cria todas as tabelas `mw_*`, bucket, policies, realtime.
2. **Hooks & lib**: copia e adapta hooks `whatsapp/*` (sem Andrew/WMS) para `src/hooks/mw/*`, edge functions com prefixo `mw-`.
3. **Componentes**: copia `conversations/`, `chat/` (sem `AndrewSummaryCard`), `settings/` (sem AI Automation), `notifications/`, `reports/`, `macros/`, `contacts/`, `setup/` para `src/components/mw/*` com tokens Mundus.
4. **Páginas e rotas**: cria `src/pages/admin/whats/*.tsx` e registra em `App.tsx`.
5. **Sidebar**: adiciona grupo "Mundus Whats" no `AdminShell` com guard `is_mundus_admin`.
6. **QA**: smoke test de rota, tema, e mock de uma instância sem credenciais (UI tem que abrir e mostrar empty states corretos).

## Preparação para o futuro

- Estrutura de `mw_conversations` já suporta status `closed` e relação com tarefas, então o **call center / tickets** que você mencionou entra depois adicionando:
  - `mw_tickets (id, conversation_id, subject, status, priority, sla_due_at, resolution)`
  - `mw_ticket_events` (timeline)
  - Painel "Tickets" em `/admin/whats/tickets`

Isso fica fora desta entrega; só deixo o schema preparado para crescer sem migration destrutiva.

---

Esta é uma entrega grande (≈ 60 arquivos novos + 1 migration + 10 edge functions). Posso seguir agora com a **Fase 1 (migration)** assim que você aprovar — depois implemento as fases 2-5 em sequência no mesmo build, sem precisar de novas confirmações.
