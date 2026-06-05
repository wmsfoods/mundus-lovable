## Contexto

Dois ajustes pequenos no fluxo de connect supplier ↔ buyer:

1. No modal **"Invite a customer"** (`src/components/supplier/InviteCustomerModal.tsx`) o campo **Country** hoje é um `<TextField>` livre. Precisa virar dropdown com bandeiras.
2. Na tela **"Connected suppliers"** do buyer (`src/pages/buyer/ConnectedSuppliers.tsx`), as colunas Supplier / Office / Country aparecem como `—` para o convite pending. Causa-raiz já identificada: RLS de `public.companies` só permite SELECT da própria company (`companies_member_select` = `id = current_user_company_id()`). O join `office:companies` em `useMyConnectedSuppliers` retorna `null` e os campos viram `—`.

Lado supplier (lista My Customers) está OK, não toca.

---

## Mudanças

### 1) `src/components/supplier/InviteCustomerModal.tsx`
- Trocar o `<TextField label={Country}>` por um `<CountrySelect>` (componente já existente em `src/components/admin/CountrySelect.tsx`, backed por `useCountriesList` que já traz `flag_emoji`).
- Mantém estado `country` como string canônica (english_name) — `useInviteBuyer` já recebe `country?: string`, sem mudança no hook.
- Aplica classe `input` para casar visual com os outros campos do modal.

### 2) Migration — permitir buyer ler company do supplier vinculado
Nova policy SELECT em `public.companies` permitindo:
- Ler a company quando existe linha em `supplier_customer_links` com `supplier_office_id = companies.id` E `buyer_company_id IN current_user_company_ids()`.
- Cobrir também o caso do **parent company** (a query atual faz um segundo fetch em `companies` por `parent_company_id`) — incluir cláusula extra que permite SELECT quando `companies.id` aparece como `parent_company_id` de uma supplier office linkada.

Policy proposta (SECURITY: scoped por SCL, não vaza catálogo geral):

```sql
CREATE POLICY companies_select_linked_supplier
ON public.companies FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.supplier_customer_links scl
    WHERE scl.buyer_company_id IN (SELECT current_user_company_ids())
      AND (
        scl.supplier_office_id = companies.id
        OR companies.id IN (
          SELECT c2.parent_company_id FROM public.companies c2
          WHERE c2.id = scl.supplier_office_id AND c2.parent_company_id IS NOT NULL
        )
      )
  )
);
```

Sem mudança em `useMyConnectedSuppliers.ts` — o join volta a retornar `name`, `country`, `parent_company_id` corretamente.

### 3) i18n
Nenhuma string nova. `supplier.myCustomers.modal.country` já existe.

---

## Verificação

- Supplier abre modal Invite a customer → campo Country mostra dropdown com bandeiras (🇧🇷 Brazil, 🇺🇸 United States, …) e salva nome canônico.
- Buyer "77 Meats US" abre Connected suppliers → linha do convite pending mostra: Supplier = "Alpha Foods" (parent) / Office = "Alpha Foods – Santos" / Country = "Brazil", Status = Invited, botões Accept/Decline funcionando.
- Linter Supabase sem novos warnings.

## Fora de escopo

- Não muda RLS de `companies` para casos não-SCL.
- Não muda lista My Customers do supplier (já OK).
- Não muda lógica de Accept/Decline/Revoke.
