## Tornar editáveis os chips de status no topo do Prospect Detail

Hoje os chips no header (`crm-chips`, linhas 185–195 em `src/pages/admin/AdminProspectDetail.tsx`) são só leitura. Quando o usuário entra em modo edição (botão "Edit"), eles continuam estáticos. A proposta é torná-los editáveis junto com o restante do formulário.

### Campos que viram editáveis

| Chip atual | Tipo no modo edição | Opções |
|---|---|---|
| **Active / Inactive** | Toggle (Switch) | `isActive: true/false` — se desativar via toggle, abre o modal de "Deactivate" para capturar o motivo (reusa fluxo existente). Reativar é direto. |
| **Stage** (ex.: Qualified) | Select | `STAGES` de `useAdminProspects` (`new`, `researching`, `contacted`, `qualified`, `onboarding`, `onboarded`, `lost`) — labels via `t("admin.crm.stages.*")` |
| **Lead type** (Buyer/Supplier) | Select | já existe em outro lugar do form, mas adiciono também aqui no header para consistência (read-only se já estiver no form abaixo — confirmar abaixo) |
| **Source** (LinkedIn, Apollo, etc.) | Select | `ProspectSource`: `linkedin`, `trade_show`, `referral`, `web_scrape`, `apollo`, `manual`, `inbound` — labels via `t("admin.crm.sources.*")` |
| **Owner** | Select | lista `OWNERS` de `useAdminProspects` |
| **Onboarded** | continua read-only | derivado, não editável manualmente |
| **Created at** | continua read-only | |

### Comportamento

- **Modo view (padrão)**: chips renderizam exatamente como hoje.
- **Modo edição** (após clicar "Edit"): cada chip vira um mini-controle inline (select pequeno / toggle), mantendo o mesmo layout horizontal e a estética de "pill". Sem quebrar em formulário separado — segue compacto no header.
- **Active toggle**:
  - `true → false`: abre `DeactivateModal` (já existe). Só persiste após confirmar com motivo.
  - `false → true`: chama `reactivateProspect` direto + toast.
- **Stage**: ao mudar, registra uma activity `stage_change` (reusa `updateProspectStage` em vez de só `updateProspect`, para manter o log).
- **Source / Owner / Lead type**: salvos junto no `save()` existente, adicionando os campos ao `updateProspect(...)` payload.
- **Cancel**: descarta tudo (já funciona via `cancelEdit`).

### Mobile

- Chips viram uma grade flex-wrap; selects com `min-height: 36px` e fonte legível.
- Toggle Active grande o suficiente para toque (mínimo 44px de área).

### Arquivos a alterar

1. `src/pages/admin/AdminProspectDetail.tsx`
   - Refatorar o bloco `crm-chips` (linhas ~185–195) para renderizar controles quando `editing === true`.
   - Estender `save()` para incluir `source`, `owner`, `leadType` no `updateProspect`.
   - Tratar mudança de `stage` via `updateProspectStage` (gera activity).
   - Tratar toggle de `isActive` abrindo `DeactivateModal` ou `reactivateProspect`.

2. `src/styles/mundus-prospect.css`
   - Pequenos ajustes para "pill em modo edit" (selects inline com a mesma altura dos chips, padding e borda sutil).

3. (sem migração — apenas UI/state local; tabela `crm_companies` já tem `is_active`, `stage`, `lead_type`, `source` para quando ligarmos no backend depois.)

### Fora de escopo

- Editar "Onboarded" (continua derivado).
- Migrar o detalhe para ler/gravar no Supabase agora — segue mock store `useAdminProspects` como hoje.
- Mudar a aparência geral dos chips em modo view.
