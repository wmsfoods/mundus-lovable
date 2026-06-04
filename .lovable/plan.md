## Problema

Na tela **Supplier → Buyer Requests** a coluna "Buyer" mostra sempre "—".

A causa não é o frontend (o código já busca `companies.name` e mapeia em `buyer_company_name`). A causa é **RLS**: a policy `companies_member_select` só permite ao usuário ver a própria company (`id = current_user_company_id()`). Como o supplier não pertence à company do buyer, o `select id, name from companies in (...)` retorna vazio e o nome cai para "—".

## Solução

Expor apenas `id + name` (dados não sensíveis, já mostrados no UI do buyer também) através de uma função `SECURITY DEFINER`, sem afrouxar a RLS da tabela `companies`.

### Backend (migration)

Criar função:

```sql
create or replace function public.get_company_names(_ids uuid[])
returns table(id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name
  from public.companies c
  where c.id = any(_ids)
$$;

revoke all on function public.get_company_names(uuid[]) from public;
grant execute on function public.get_company_names(uuid[]) to authenticated;
```

Retorna apenas nome — sem campos sensíveis. Acesso restrito a usuários autenticados.

### Frontend

`src/pages/supplier/Requests.tsx` (linhas 100-107): trocar o `select` direto na tabela `companies` por:

```ts
const { data: cos } = await supabase.rpc("get_company_names", { _ids: companyIds });
```

Mesmo formato de retorno (`{ id, name }[]`), restante do código (mapeamento, render da coluna, busca textual, navegação) permanece igual.

## Arquivos afetados

- `supabase/migrations/<timestamp>_get_company_names.sql` (novo)
- `src/pages/supplier/Requests.tsx` (1 trecho)

## Fora de escopo

Outras telas onde o supplier vê nomes de buyer (negociações, ofertas) — verifico se precisam do mesmo ajuste só se você reportar problema; este plano cobre só a tela de Buyer Requests reportada.
