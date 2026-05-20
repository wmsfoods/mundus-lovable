
# My Company — CRUD real + layout refinado

Hoje `SupplierCompany.tsx` é 100% mock. Vamos transformar em CRUD real, com cada empresa vendo a sua e admin vendo/editando todas via tabs em `AdminCompanyDetail`.

## 1. Banco — 6 tabelas novas + storage bucket

Migration única criando:

- **company_about** (1:1 com company) — description, trade_markets (text[]), main_species (text[]), years_exporting (int), fcls_delivered (int), countries_served (int), member_since (int), trade_name, logo_text
- **company_plants** (N:1) — name, city, country, country_code, capacity, certifications (text[]), vet_registrations
- **company_certifications** (N:1) — name, valid_until (date), certificate_url, issuer
- **company_documents** (N:1) — type (Brochure/Video/Manual/SOP/Insurance/Other), name, file_url, file_size, mime_type, updated_at
- **company_team_members** (N:1) — name, title, email, whatsapp, photo_url, sort_order
- **company_preferences** (1:1) — default_incoterm, default_payment_terms, currencies (text[]), lead_time, fcl_size, origin_ports (text[])

Storage bucket `company-files` (público para leitura, escrita restrita).

**RLS** (mesmo padrão das tabelas atuais):
- `is_mundus_admin()` → ALL em tudo
- Membros da empresa → SELECT + INSERT/UPDATE/DELETE onde `company_id = current_user_company_id()`
- Leitura pública da `company_about` (página pública de fornecedor) — opcional, deixar restrita por padrão

## 2. Hooks

`src/hooks/useCompanyProfile.ts` — load/save tudo de uma empresa (recebe `companyId`). Reusado por supplier (passa `currentCompanyId`) e admin (passa `:id` da rota).

Sub-hooks granulares: `useCompanyPlants`, `useCompanyCerts`, `useCompanyDocuments`, `useCompanyTeam`, `useCompanyPreferences`, `useCompanyAbout` — cada um com CRUD + realtime opcional.

## 3. Admin — Tabs em AdminCompanyDetail

Adicionar tab bar logo abaixo do header existente:

```text
[ Profile ] [ About ] [ Plants ] [ Certifications ] [ Documents ] [ Team ] [ Preferences ]
```

- **Profile** = formulário atual (não muda)
- **About / Plants / Certs / Docs / Team / Prefs** = novos componentes em `src/components/admin/company/` (`AboutTab`, `PlantsTab`, etc.), cada um com tabela + modal de add/edit + delete confirm
- Roteamento por query param `?tab=plants` (mantém deep-link)
- Em `mode="new"` só mostra Profile; outras tabs aparecem após criar a empresa

## 4. Supplier — Layout refinado + CRUD inline

Refatorar `SupplierCompany.tsx`:
- Substituir todos os arrays MOCK por dados reais via hooks
- Separações suaves entre seções: dividers `border-t border-border/40` + espaçamento aumentado, sub-headers com micro-label uppercase + linha fina
- Botão "Edit" por seção abre drawer/modal (não tela inteira)
- "Upload document" real → seleciona arquivo, sobe para `company-files/<company_id>/...`, cria row em `company_documents`
- Empty states amigáveis ("Nenhuma planta cadastrada — adicione a primeira")

Refinamento CSS em `mundus-company.css`:
- Aumentar `gap` entre `.cp-card` para `20px`
- Adicionar `.cp-divider` (linha 1px com opacidade 40%)
- Sub-seções com `.cp-sub-head` (label uppercase 11px, tracking 0.6px)
- Hover sutil nos itens editáveis

## 5. i18n

Adicionar chaves em EN/PT/ES sob `admin.companies.tabs.*`, `supplier.company.*.empty`, `supplier.company.*.add/edit/delete`, `supplier.company.documents.upload.*` (success/error/sizeLimit).

## 6. Verificação

- Build automático
- Testar como supplier (vê só a sua) e admin (vê todas via tabs)
- Upload de PDF real no bucket
- CRUD em cada seção (add/edit/delete com confirm)

## Detalhes técnicos

- Documents: validar mime (pdf, jpg, png, mp4 até 20MB), salvar `file_size` para exibição
- Plants: country_code precisa do flag — manter componente `FlagSVG` existente
- Certifications: alerta visual quando `valid_until` < 60 dias
- Team: opção de marcar 1 como "primary contact"
- Preferences: campos opcionais; mostra "—" quando vazio

## Fora de escopo (proposto)

- Página pública do supplier (`/supplier/:slug`) — fica para depois
- Sincronização Team ↔ company_users — separados conforme escolha
- Versionamento de documentos — só substitui

Vou começar pela migration e, após sua aprovação dela, seguir com hooks + UI.
