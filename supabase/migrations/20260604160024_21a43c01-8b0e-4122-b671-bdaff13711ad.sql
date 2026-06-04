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