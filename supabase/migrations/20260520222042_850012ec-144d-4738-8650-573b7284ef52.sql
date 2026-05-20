create table if not exists public.prospect_phone_reveals (
  id uuid primary key default gen_random_uuid(),
  apollo_person_id text not null unique,
  phone text,
  mobile text,
  raw jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.prospect_phone_reveals enable row level security;

create policy "auth read phone reveals"
on public.prospect_phone_reveals
for select
to authenticated
using (true);
