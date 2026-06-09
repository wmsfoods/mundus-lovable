create or replace function public.get_supplier_customer_companies(p_office_id uuid)
returns table (id uuid, name text, country text, tax_id text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name, c.country, c.tax_id
    from public.companies c
    join public.supplier_customer_links scl on scl.buyer_company_id = c.id
   where scl.supplier_office_id = p_office_id
     and c.id is not null;
$$;

grant execute on function public.get_supplier_customer_companies(uuid) to authenticated;