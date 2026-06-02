## Status atual da Silva Foods (Debora)

- `auth.users`: existe (`4242a611-66e9-4eaf-aa5f-ff795df1233f`, debora.adm71@gmail.com)
- `user_requests`: **approved**, `approved_company_id = e77a9204…` (Silva Foods), mas `created_user_id` está NULL
- `public.users`: **vazio** (sem linha pra ela)
- `company_users`: **vazio** → por isso ela não aparece no Team da Silva Foods
- `user_offices`: vazio

Aprovação foi feita **antes** do fix do `ON CONFLICT` e do trigger novo em `user_requests`, então a função central nunca rodou pra ela.

Encontrei mais um caso parecido no backlog: **Fatima Nascimento (finance@wmsfoods.us — Meat USA Company)**. Ela tem `public.users` e `company_users` (provavelmente criados manualmente), mas `created_user_id` no `user_requests` continua NULL. Vale incluir no hotfix.

---

## Plano

### 1. Hotfix imediato (backfill)
Rodar `link_approved_user_request_by_email` para os dois emails órfãos:
- `debora.adm71@gmail.com` → cria `public.users`, `company_users` (role `master_buyer`, status `active`), `user_offices` no HQ Silva Foods e preenche `created_user_id`.
- `finance@wmsfoods.us` → idempotente; só vai preencher `created_user_id` (o resto já existe).

Validar depois: contagem em `public.users` / `company_users` / `user_offices` para os dois user_ids, e `created_user_id` preenchido em `user_requests`.

### 2. Resposta à pergunta — “tudo ali em cima funciona para novos usuários?”

**Sim.** Verifiquei no banco que toda a cadeia está montada:

| Componente | Estado |
|---|---|
| `link_approved_user_request_by_email(email)` | ✅ corrigida (`ON CONFLICT (company_id, user_id)`) |
| Trigger `link_on_user_request_approve` em `user_requests` (AFTER INSERT/UPDATE de `status, company_id`) | ✅ ativo, chama a função central |
| Trigger `link_approved_user_request` em `auth.users` (AFTER INSERT) | ✅ ativo, cobre signup-após-aprovação |
| `claim_pending_invites()` chamado no login | ✅ chama a função central como 3ª camada |
| `AdminUserRequests.tsx` | ✅ resolve/cria a `companies`, grava `approved_company_id` no UPDATE pra status=approved, e ainda chama o RPC como safety net |

Casos cobertos para novos usuários:
1. **Signup → aprovação depois** (caminho mais comum): trigger em `user_requests` dispara no UPDATE pra approved → função central cria tudo.
2. **Aprovação → signup depois** (admin aprova baseado em request antes da conta existir): trigger em `auth.users` dispara no INSERT da conta → função central cria tudo.
3. **Login Google** (cria `auth.users` só no 1º login): mesmo trigger (#2) cobre. E `claim_pending_invites` no login é o cinto-e-suspensório final.
4. **Race / falha do trigger**: RPC chamado direto pelo Admin logo depois do UPDATE garante.

Após esse hotfix, **nenhum buyer/supplier aprovado deve ficar fora do Team da sua própria empresa** — nem agora nem no futuro.

### Resumo do que vou executar em build mode
- Backfill via `link_approved_user_request_by_email('debora.adm71@gmail.com')`
- Backfill via `link_approved_user_request_by_email('finance@wmsfoods.us')`
- Query de verificação confirmando Silva Foods e Meat USA com membro ativo no Team
