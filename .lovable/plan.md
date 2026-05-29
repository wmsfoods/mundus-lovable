# Admin: Create Request on behalf of managed buyer

## Análise — zero conflito confirmado

Validei o prompt contra o código atual. O padrão equivalente já existe e funciona no lado supplier:
- `AdminOffers.tsx` (linha 362) navega para `/admin/create-offer?as_company={id}`.
- `App.tsx` (linha 273) monta `<Route path="create-offer" element={<SupplierCreateOffer />} />` dentro do shell `/admin`.
- `SupplierCreateOffer.tsx` (linhas 187, 225) lê `as_company` via `searchParams` e opera em modo on-behalf.

Para o lado buyer já temos tudo pronto também:
- `BuyerCreateRequest.tsx` usa `useCurrentCompany()` e referencia `company.id` em apenas 3 pontos (linhas 157, 548, 558) — substituição cirúrgica por um `effectiveCompanyId`.
- `AdminBuyerRequests.tsx` é a página de listagem onde entra o botão.
- Coluna `mundus_managed_buyer` em `companies` já existe (usada hoje no app).
- `requestNumber.ts`, parse de cuts, notificações: ficam intocados (são chamados depois do submit, mesma rotina).

Nenhuma regra de negócio muda. Nenhum schema novo. Nenhuma RPC nova. Sem reescrita do wizard. Sem impacto no fluxo `/buyer/requests/new`. Sem mexer em negociações, FCL, confirm/accept, chat, etc.

## Mudanças (escopo mínimo)

### 1. Rota admin
`src/App.tsx`: adicionar dentro do grupo `/admin` (ao lado de `create-offer`):
```
<Route path="create-request" element={<BuyerCreateRequest />} />
```
Já fica protegida pelo `RequireAdmin` existente.

### 2. Botão + modal "Create Request for…"
`src/pages/admin/AdminBuyerRequests.tsx`:
- Botão **"+ Create Request"** no header (wine `#8B2252`), mesma posição/estilo do "+ Create Offer" em `AdminOffers`.
- Modal **"Create Request for…"** copiando 1:1 o markup/estilo do modal "Create Offer for…" do `AdminOffers` (mesmo overlay, card, row, Cancel).
- Query: `companies` onde `mundus_managed_buyer = true AND is_buyer = true AND deleted_at IS NULL`, order by name. Linhas: logo (fallback 🛒) + nome + país.
- Subtitle: "Select a managed buyer to create a request on their behalf."
- Empty state: "No managed buyers. Go to Companies → toggle 'Mundus manages requests for this buyer' first."
- Seleção → navega para `/admin/create-request?as_company={companyId}`.

### 3. Modo on-behalf no `BuyerCreateRequest.tsx`
Espelhar exatamente como `SupplierCreateOffer` faz:
- Ler `as_company` via `useSearchParams()`.
- Se presente **E** `useIsMundusAdmin().isAdmin === true`: resolver `effectiveCompanyId = as_company`; senão `effectiveCompanyId = company.id` (fallback do não-admin é silencioso, nunca spoof).
- Carregar dados da target buyer (protein profile, cuts preferidos, ports salvos, contato primário, defaults) usando `effectiveCompanyId` — mesmo pattern do supplier flow para popular o wizard.
- Banner de contexto no topo: "Creating request on behalf of **{Buyer Company Name}**" + logo (clone visual do banner do supplier flow).
- Substituir os 3 usos de `company.id` (linhas 157, 548, 558) por `effectiveCompanyId`. `buyer_company_id` no insert = `effectiveCompanyId`.
- Submit roda **toda** a pipeline atual (request number, parse cuts, notificações) — nada é pulado.
- Sem `as_company` → comportamento atual do `/buyer/requests/new` inalterado.

### 4. Traceability
- `created_user_id` = admin atual (actor); `company_id` (buyer) = target.
- `auditLog`: `{ action: "request.created_on_behalf", category: "request", entityType: "request", entityId: newRequestId, details: { buyer_company_id, buyer_company_name, created_by_admin: true } }`. Só se chamar fora do path normal de buyer (gate por `isAdmin && as_company`).
- Não inventar colunas novas. Se o offer flow já marca alguma flag análoga (a verificar no submit do SupplierCreateOffer), espelhar — caso contrário, audit log é suficiente.

### 5. RLS / Permissões
Antes de codar, conferir as policies da tabela `requests` (ou equivalente usada por `BuyerCreateRequest`):
- Se já permite `is_mundus_admin()` inserir para `company_id` arbitrário (como faz no offers path), nada a mudar.
- Se o offer flow usa uma SECURITY DEFINER RPC, espelhar a mesma estratégia para requests.
- Sem alteração se a policy admin já cobre — só validar.

### 6. i18n
Adicionar em `en/pt/es/fr/zh.json`:
- `admin.requests.createBtn` "Create Request"
- `admin.requests.createForTitle` "Create Request for…"
- `admin.requests.createForSubtitle` "Select a managed buyer to create a request on their behalf."
- `admin.requests.createForEmpty` "No managed buyers. Go to Companies → toggle 'Mundus manages requests for this buyer' first."
- `request.onBehalfBanner` "Creating request on behalf of {{company}}"
- + Cancel/close já existem.

## Não-regressão / checklist de conflito

| Área | Risco | Mitigação |
|---|---|---|
| `/buyer/requests/new` | Mudança em `BuyerCreateRequest` quebrar buyer normal | Tudo gated em `as_company && isAdmin`; fallback usa `company.id` como hoje |
| RLS de `requests` | Insert admin pode falhar | Validar policy antes; reusar abordagem do offer flow se necessário |
| `requestNumber`, parse-cuts, notificações | Pipeline pular para admin | Submit chama exatamente o mesmo handler |
| Negotiation/FCL/chat/confirm | — | Não tocados |
| Não-admin com `?as_company=` na URL | Spoof | Ignorado, cai em `company.id` |
| Schema | — | Zero migration |
| Tipos Supabase | — | Sem nova tabela/coluna |

## Resposta direta
Sim, dá pra implementar com **zero conflito**. É 100% espelho do fluxo já existente do supplier, reusando o wizard atual do buyer. As únicas mudanças são: 1 rota nova no admin, 1 botão+modal em `AdminBuyerRequests`, e 4 ajustes pontuais no `BuyerCreateRequest` (read param, resolve company, banner, audit). Nenhuma lógica de negócio, negociação, ou schema é alterada.
