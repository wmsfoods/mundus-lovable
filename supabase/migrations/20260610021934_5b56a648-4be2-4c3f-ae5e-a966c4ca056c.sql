-- ===== Introspecção =====
create or replace function public.mcp_list_tables(p_schema text default null)
returns table(table_schema text, table_name text, table_type text, est_rows bigint)
language sql security definer set search_path = public as $$
  select t.table_schema, t.table_name, t.table_type,
         coalesce(c.reltuples::bigint, 0)
  from information_schema.tables t
  left join pg_class c on c.relname = t.table_name
    and c.relnamespace = (select oid from pg_namespace where nspname = t.table_schema)
  where t.table_schema not in ('pg_catalog','information_schema')
    and (p_schema is null or t.table_schema = p_schema)
  order by t.table_schema, t.table_name;
$$;

create or replace function public.mcp_describe_table(p_schema text, p_table text)
returns table(column_name text, data_type text, is_nullable text, column_default text)
language sql security definer set search_path = public as $$
  select column_name, data_type, is_nullable, column_default
  from information_schema.columns
  where table_schema = p_schema and table_name = p_table
  order by ordinal_position;
$$;

-- ===== Leitura segura auth/storage (read-only) =====
create or replace function public.mcp_auth_users(p_limit int default 100)
returns table(id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, email_confirmed_at timestamptz)
language sql security definer set search_path = public as $$
  select id, email, created_at, last_sign_in_at, email_confirmed_at
  from auth.users order by created_at desc
  limit greatest(1, least(p_limit, 500));
$$;

create or replace function public.mcp_storage_objects(p_bucket text default null, p_limit int default 100)
returns table(id uuid, bucket_id text, name text, size_bytes bigint, created_at timestamptz)
language sql security definer set search_path = public as $$
  select o.id, o.bucket_id, o.name, (o.metadata->>'size')::bigint, o.created_at
  from storage.objects o
  where p_bucket is null or o.bucket_id = p_bucket
  order by o.created_at desc
  limit greatest(1, least(p_limit, 500));
$$;

-- ===== Bloqueio de acesso público às funções =====
revoke all on function public.mcp_list_tables(text)            from public, anon, authenticated;
revoke all on function public.mcp_describe_table(text,text)    from public, anon, authenticated;
revoke all on function public.mcp_auth_users(int)              from public, anon, authenticated;
revoke all on function public.mcp_storage_objects(text,int)    from public, anon, authenticated;
grant execute on function public.mcp_list_tables(text)         to service_role;
grant execute on function public.mcp_describe_table(text,text) to service_role;
grant execute on function public.mcp_auth_users(int)           to service_role;
grant execute on function public.mcp_storage_objects(text,int) to service_role;