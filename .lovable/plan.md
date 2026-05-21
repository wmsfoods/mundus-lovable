# Nova tela de Create Request (Buyer)

Substituir o modal pequeno atual (`NewRequestModal.tsx`) por uma página/modal full-screen com o mesmo padrão visual da tela de criação de oferta do supplier — só que mais enxuta, refletindo que o buyer apenas pede o que precisa (o supplier completa preço final, marbling avançado etc.).

## Layout (espelho do screenshot)

Header rosa com ícone, título "New offer request" e subtítulo "Describe what you need — suppliers will respond with offers."

Grid principal em 2 colunas (desktop) e empilhado (mobile):

**Coluna esquerda — "What you need"**
- Linha de seletores: Species (Beef/Pork/Poultry/Ovine) · Destination country* · Incoterm* (CFR/CIF/FOB)
- Card "Cuts requested" com:
  - Header: contador de cuts + Total volume + barra de % do container
  - Tabela inline editável (mesmo estilo da supplier): `# | Cut | Spec (opcional) | Marbling | Qty (kg) | Target $/kg | ×`
  - Botão "+ Add cut"
  - Botão secundário no topo do card: **"Paste / Import with AI"** (abre painel)
  - Tip line: "target price é opcional…"

**Coluna direita — "Logistics & terms"**
- Container: toggle 20'FCL / 40'FCL + nº de containers
- Shipment window (texto livre, ex.: "June 2026 / Prompt") — mais leve que o month picker atual
- Compliance: checkboxes Halal / Kosher
- Notes for suppliers (textarea)

**Footer fixo**
- Esquerda: resumo "N cuts · X kg · N×40ft"
- Direita: Cancel + Broadcast request (primário)

## Painel "Paste / Import with AI"

Drawer/modal que aceita:
1. **Colar do Excel / texto livre**: textarea grande. Detecta colunas separadas por tab/`;`/`,` e tenta mapear `cut`, `qty`, `target price`, `spec`.
2. **Upload de .xlsx/.csv** (drag-and-drop, usando parsing client-side simples — `xlsx` já não está no projeto, então no primeiro passo só CSV/TSV nativo + colar).
3. **"Parse with AI"**: envia o texto colado para edge function nova `parse-request-cuts` (Lovable AI / `google/gemini-2.5-flash`) com prompt estruturado retornando JSON `[{cut, spec, qty_kg, target_price_per_kg}]`. Loading spinner; preview das linhas detectadas com checkbox; "Add to request" anexa à tabela de cuts.

Fallback sem IA: parsing local heurístico já popula a tabela; botão "Improve with AI" reorganiza/normaliza nomes de cuts contra a lista de `cutsByCategory`.

## Lógica / consistência com supplier

- Mesmas estruturas de cut (`cat`, `cut`, `spec`, `qty`, target price) — assim quando a request virar offer, o supplier só precisa completar `pkg`, `grade`, `aging`, `floor` e ajustar `ask`.
- Reusar `useSupplierOfferData` para listas de cuts/markets/ports — buyer e supplier compartilham o catálogo.
- Mesmas classes CSS de `mundus-create-offer-v2.css` (header, cards, tabela inline, footer sticky) — adicionar apenas overrides pontuais em `mundus-requests.css`.

## Mobile

- Header colapsa em 1 coluna; cards de Logistics aparecem antes ou depois dos cuts (a definir; default: depois).
- Tabela de cuts vira lista de cards verticais com campos empilhados (mesmo padrão já usado em supplier mobile).
- Footer sticky bottom com botão "Broadcast" full-width.

## Arquivos

- **Novo**: `src/pages/buyer/BuyerCreateRequest.tsx` (página full-screen, rota `/buyer/requests/new`).
- **Novo**: `src/components/buyer/RequestPasteImport.tsx` (drawer do paste/AI).
- **Novo**: `supabase/functions/parse-request-cuts/index.ts` (Lovable AI, sem secrets).
- **Edit**: `src/App.tsx` adiciona rota.
- **Edit**: `src/pages/buyer/BuyerRequests.tsx` — botão "New request" passa a navegar para `/buyer/requests/new` em vez de abrir modal.
- **Edit**: `src/styles/mundus-requests.css` — overrides finos.
- **Remover/aposentar**: `src/components/buyer/NewRequestModal.tsx` (deletado depois que a nova rota estiver no ar).
- **i18n**: chaves em `buyer.requests.create.*` nos 3 idiomas.

## Pontos a confirmar (vou perguntar antes de executar)

1. Rota dedicada (`/buyer/requests/new`) ou manter como modal full-screen? Recomendo rota.
2. Para o "Paste with AI" — ok usar Lovable AI (`google/gemini-2.5-flash`, sem custo de API key)?
3. Manter campos atuais que sumirão por padrão: payment terms, destination port (granular). Confirmo que viram opcionais escondidos atrás de "More options" ou removo de vez?