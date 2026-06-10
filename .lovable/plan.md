## Objetivo

Dentro do drawer que abre ao clicar num **Importador** ou **Exportador** (`EntityDrawer.tsx`), adicionar uma seção "Apollo" que permita buscar a empresa por nome + país e listar people (contatos) associados — reusando a integração Apollo já existente (`prospect-search` / `prospect-enrich`).

## O que será adicionado

Nova seção colapsável "Inteligência Apollo" no `EntityDrawer`, abaixo dos blocos atuais (Top compradores / Top destinos / Top produtos), apenas para `kind === "shipper" | "consignee"` (não para `destCountry`).

A seção tem 3 estados:

1. **Empresa** — busca automática ao abrir o drawer
   - Chama `prospect-search` com `entity: "companies"`, `q_organization_name: <name do drawer>`, `organization_locations: [<país inferido>]` quando houver, `per_page: 5`.
   - País é inferido assim: se `kind === "shipper"` → "Brazil" (BR é a base de exportações); se `kind === "consignee"` → não envia país (deixa Apollo amplo) — admin pode refinar.
   - Mostra até 5 candidatos como cards compactos (logo, nome, domínio, país/cidade, indústria, nº de funcionários, link LinkedIn/site).
   - Admin escolhe o match correto clicando "Selecionar".

2. **People da empresa selecionada**
   - Após selecionar a empresa, chama `prospect-search` com `entity: "people"`, `organization_ids: [id]`, `per_page: 10`.
   - Lista people: foto, nome, cargo, seniority, cidade/país, ícones LinkedIn/email.
   - Cada pessoa tem botão "Revelar email" que chama `prospect-enrich` com `{ id, first_name, last_name, organization_name }` e mostra o email retornado (sem persistir no CRM — apenas exibe).

3. **Refinar busca**
   - Campos editáveis (nome + país) com botão "Buscar novamente", caso o auto-match não traga a empresa certa.

## Estados de erro / fallback

- Se `apollo_api_key_missing` → mostrar aviso "Apollo não configurado" com link discreto para Configurações.
- Se Apollo retornar 0 resultados → "Nenhuma empresa encontrada — refine o nome/país".
- Loading com skeletons reaproveitando `WidgetShell`.

## Arquivos

- **Editar**: `src/pages/admin/marketData/v2/EntityDrawer.tsx` — adicionar a nova seção e os hooks de estado local.
- **Criar**: `src/pages/admin/marketData/v2/ApolloLookup.tsx` — componente isolado (`<ApolloLookup name={name} kind={kind} />`) que encapsula busca de empresa + people + reveal.
- Reuso: `src/hooks/useProspectSearch.ts` (helpers `mapCompany`, `mapPerson`) e `prospect-enrich` edge function (já existem; não alterar).

## Detalhes técnicos

- Chamadas via `supabase.functions.invoke("prospect-search", { body: {...} })` — mesma forma usada em `useProspectSearch`.
- Sem mudanças no schema, sem nova migration, sem mudança no edge function.
- Mobile: a seção segue a largura do `SheetContent` (`w-full sm:max-w-2xl`); cards em coluna única no mobile, 2 colunas em sm+.
- Sem persistência: é uma ferramenta de exploração read-only. (Botão "Salvar como prospect no CRM" pode vir depois se você pedir.)

## Fora do escopo

- Persistir empresa/people encontrados no CRM.
- Revelar telefone (usa webhook async — adicionar depois se necessário).
- Mostrar Apollo em outros lugares além do `EntityDrawer`.
