# Refinar mundus-admin-mcp v0.3.0 — introspecção + leitura segura auth/storage

Adição não-destrutiva: 4 novas tools (`list_tables`, `describe_table`, `auth_users`, `storage_objects`), denylist de escrita expandida e 4 funções RPC `SECURITY DEFINER` no schema `public` (executáveis só pelo `service_role`).

## 1. Nova migration

Criar `supabase/migrations/<timestamp>_mcp_introspection.sql` com o SQL exato fornecido:

- `public.mcp_list_tables(p_schema text default null)` — lista tabelas/views de todos os schemas (exceto `pg_catalog`/`information_schema`) com estimativa de linhas.
- `public.mcp_describe_table(p_schema, p_table)` — colunas, tipo, nullable, default.
- `public.mcp_auth_users(p_limit int default 100)` — leitura read-only de `auth.users` (limite máx. 500).
- `public.mcp_storage_objects(p_bucket, p_limit)` — leitura read-only de `storage.objects`.
- Todas com `SECURITY DEFINER`, `search_path = public`, `REVOKE` de `public/anon/authenticated` e `GRANT EXECUTE` somente ao `service_role`.

Nenhuma tabela criada, nenhuma RLS tocada, nenhum schema novo exposto no PostgREST.

## 2. Editar `supabase/functions/mundus-admin-mcp/index.ts`

- Bump da versão: `version: '0.2.0'` → `'0.3.0'`.
- Expandir o default da `WRITE_DENYLIST` para:
  `round_proposals,cut_rounds,mcp_audit_log,audit_log,admin_action_log,negotiation_audit,offer_snapshots,offer_views,email_events`
  (todas existem no schema — confirmado contra `<supabase-tables>`).
- Registrar 4 novas tools logo após `db_insert`, exatamente como especificado: `list_tables`, `describe_table`, `auth_users`, `storage_objects`.
  - `list_tables` adiciona flag `writable: !WRITE_DENYLIST.has(table_name)` em cada linha.
- `db_insert` e `db_update` permanecem inalterados (escrita só em `public`).
- As 6 tools existentes (`health`, `db_select`, `db_count`, `get_record`, `db_update`, `db_insert`) ficam idênticas; `health` passa automaticamente a refletir a denylist expandida no payload.

## 3. Verificações pós-deploy

- Compilação ok (lovable redeploy automático).
- `health` retorna `mode: 'read-write'` + denylist com 9 tabelas.
- `list_tables` retorna tabelas com `writable=false` para as 9 denylisted.
- `describe_table` retorna colunas; `auth_users` e `storage_objects` retornam dados.
- Tools antigas comportam-se idêntico.

## O que NÃO muda

- RLS de nenhuma tabela.
- Exposed schemas do PostgREST (continua só `public`).
- Auth do edge function (bearer token continua igual).
- Dados existentes.
- Schema `vault` (não tocado).
