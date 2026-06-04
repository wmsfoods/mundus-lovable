create or replace function public.get_users_company_info(_user_ids uuid[])
returns table(user_id uuid, user_name text, company_id uuid, company_name text)
language sql
stable
security definer
set search_path = public
as $$
  select u.id, u.name, u.company_id, c.name
  from public.users u
  left join public.companies c on c.id = u.company_id
  where u.id = any(_user_ids)
$$;

revoke all on function public.get_users_company_info(uuid[]) from public;
grant execute on function public.get_users_company_info(uuid[]) to authenticated;