create table if not exists public.mcp_audit_log (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  table_name text not null,
  record_id text,
  payload jsonb,
  source text not null default 'admin-mcp',
  created_at timestamptz not null default now()
);

grant all on public.mcp_audit_log to service_role;

alter table public.mcp_audit_log enable row level security;
-- No policies: only service_role (which bypasses RLS) may access.