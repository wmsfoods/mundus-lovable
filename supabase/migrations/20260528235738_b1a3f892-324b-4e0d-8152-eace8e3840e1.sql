
ALTER TABLE public.users DISABLE TRIGGER users_prevent_identity_change;

UPDATE public.users
   SET company_id='e42e8a41-6317-4777-8a46-db8ee19d0dfb',
       active_company_id='e42e8a41-6317-4777-8a46-db8ee19d0dfb',
       is_owner=true
 WHERE email='finance@wmsfoods.us';

ALTER TABLE public.users ENABLE TRIGGER users_prevent_identity_change;

DELETE FROM public.company_users
 WHERE user_id='4aec3247-acf4-4518-ae7b-8cfe8e795bea'
   AND company_id='19c2875e-cfd6-49f2-9662-da5cc2a250b8';

INSERT INTO public.company_users (company_id, user_id, full_name, email, role, status, joined_at, accepted_at)
VALUES ('e42e8a41-6317-4777-8a46-db8ee19d0dfb','4aec3247-acf4-4518-ae7b-8cfe8e795bea',
        'WMS Foods Finance','finance@wmsfoods.us','master_supplier','active', now(), now())
ON CONFLICT DO NOTHING;

DELETE FROM public.user_offices WHERE user_id='4aec3247-acf4-4518-ae7b-8cfe8e795bea' AND company_id='19c2875e-cfd6-49f2-9662-da5cc2a250b8';

INSERT INTO public.user_offices (user_id, company_id, role, is_primary)
VALUES ('4aec3247-acf4-4518-ae7b-8cfe8e795bea','e42e8a41-6317-4777-8a46-db8ee19d0dfb','office_admin', true)
ON CONFLICT (user_id, company_id) DO UPDATE SET is_primary=true, role='office_admin';

DELETE FROM public.companies WHERE id='19c2875e-cfd6-49f2-9662-da5cc2a250b8';

UPDATE public.companies SET is_supplier=true, is_buyer=false WHERE id='e42e8a41-6317-4777-8a46-db8ee19d0dfb';
