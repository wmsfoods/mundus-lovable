# Arquitetura mobile do Mundus

Objetivo: dar ao mobile um modelo de navegação próprio (tab roots + telas empilhadas) e uma estratégia clara para telas densas, sem tocar nas regras do desktop. Tudo é ativado por `isMobile` e media queries; o desktop continua usando topbar + sidebar + tabelas como hoje.

---

## 1. Modelo de navegação mobile

### Conceitos

- **Tab root**: telas alcançadas direto pela bottombar ou home. Mostram topbar slim + bottombar.
  - Buyer: `/buyer`, `/buyer/offers`, `/buyer/requests/new`, `/buyer/chat`, `/buyer/orders`
  - Supplier: `/supplier`, `/supplier/offers`, `/supplier/offers/new`, `/supplier/negotiations`, `/supplier/sales`
- **Stack screen**: qualquer rota de detalhe ou sub-fluxo. Substitui topbar+bottombar por um **StackHeader** minimalista (back + título + ações contextuais). Regra automática: rota com `:id`, terminada em `/new`, ou marcada como `profile`/`chat/:conversationId`.

### Comportamento

- Em mobile, `BuyerShell`/`SupplierShell` detectam se a rota atual é stack via match de pattern (`useMatches` do react-router). Se sim:
  - Renderizam `<StackHeader />` no lugar do `<Topbar />`.
  - Não renderizam `<BottomNav />`.
  - `<main>` ganha `padding-top` do header e remove o reserva da bottombar.
- Voltar usa `navigate(-1)` com fallback para a tab root pai (ex: offer detail → `/buyer/offers`).
- Desktop ignora tudo isso: continua com sidebar fixo, topbar atual e sem stack header.

### Componente `StackHeader`

- Altura compacta (~52px), sticky, respeita `safe-area-inset-top`.
- Slots: `back` (sempre), `title` (string ou nó), `actions` (até 2 ícones — ex: editar, compartilhar, mais).
- Título vem de uma config por rota (ver seção 4) ou de prop passada pela própria página.

### Bottombar atual

- Continua igual nas tab roots. Só some nas stack screens. A regra fica concentrada no shell — páginas não precisam saber.

---

## 2. Tabelas complexas no mobile

Estratégia única: **cards verticais com hierarquia**. Toda listagem em tabela vira lista de cards em `< 768px`. Desktop mantém `<table>` atual sem alterações.

### Padrão visual do card

```text
┌──────────────────────────────────────────────┐
│ Título principal              [chip status]  │
│ Subtítulo / contraparte                      │
│ ──────────────────────────────────────────── │
│ Label 1: valor    Label 2: valor             │
│ Label 3: valor                               │
│ ──────────────────────────────────────────── │
│ Ação primária →                              │
└──────────────────────────────────────────────┘
```

- 1 título forte, 1 subtítulo, 2–3 metadados em grid 2 colunas, status como chip colorido, ação principal como link/CTA cobrindo o card.
- Tap no card → navega para o detalhe (que já será stack screen).

### Filtros e ordenação

- Botões de filtro/sort que hoje ficam acima da tabela viram um **bottom sheet** disparado por um botão "Filtros (N)" sticky no topo da lista.
- Busca permanece visível como input fixo no topo da lista.

### Implementação

- Criar um componente `ListCard` reutilizável em `src/components/mundus/ListCard.tsx` (título, subtítulo, meta[], chip, href/onClick).
- Em cada página de listagem (Offers, Orders, Negotiations, Sales, Requests, Users), envolver a tabela atual em:
  ```tsx
  {isMobile ? <ListCardList items={...} /> : <Table>...</Table>}
  ```
- `useIsMobile()` já existe no projeto e cobre o breakpoint.

---

## 3. Fluxograma resultante (buyer, exemplo)

```text
TAB ROOTS (topbar slim + bottombar)
  /buyer            Home
  /buyer/offers     Lista de ofertas (cards no mobile, tabela no desktop)
  /buyer/orders     Lista de pedidos
  /buyer/chat       Lista de conversas
  /buyer/requests/new  Criação rápida (tab "+")

STACK SCREENS (StackHeader, sem bottombar)
  /buyer/offers/:id        ← back vai para /buyer/offers
  /buyer/orders/:id        ← back vai para /buyer/orders
  /buyer/requests          ← back vai para /buyer
  /buyer/requests/:id      ← back vai para /buyer/requests
  /buyer/negotiations      ← back vai para /buyer
  /buyer/negotiations/:id  ← back vai para /buyer/negotiations
  /buyer/chat/:conversationId ← back vai para /buyer/chat
  /buyer/users             ← back vai para /buyer
  /buyer/profile           ← back vai para /buyer
```

Mesma lógica para supplier. Desktop permanece com sidebar + breadcrumbs como hoje.

---

## 4. Detalhes técnicos

- **Detecção de stack**: pequena função `isStackRoute(pathname)` com regex (`/:id`, `/new`, `/profile`, `/chat/[^/]+`) + lista de overrides opcional. Mora em `src/lib/mobile-nav.ts`.
- **Título da stack**: cada rota stack exporta `pageMeta = { title, actions? }` consumido pelo shell via context; fallback para um mapa central em `mobile-nav.ts` (i18n).
- **StackHeader**: `src/components/mundus/StackHeader.tsx`. Botão back com `navigate(-1)`, fallback para tab root via mapa.
- **Shells**: `BuyerShell` e `SupplierShell` passam a alternar entre `<Topbar />`+`<BottomNav />` e `<StackHeader />` com base em `isMobile && isStackRoute(...)`. Desktop sempre Topbar + Sidebar.
- **CSS**:
  - Novo arquivo `src/styles/mundus-stack-header.css` (só ativo em mobile via `.app-shell.is-mobile.is-stack`).
  - `mundus-shell.css` ganha bloco mobile para esconder bottombar quando `.is-stack`.
  - Cards de lista usam tokens existentes (`--radius`, `--border`, `--p800`), sem novas cores.
- **ListCard**: componente único; cada página alimenta com seu mapeamento. Mantém `<table>` atual intocada no desktop.
- **Sem mudanças** em: rotas, RLS, auth, dados, sidebar desktop, topbar desktop, breadcrumbs desktop.

---

## 5. Entregas

1. `mobile-nav.ts` + `StackHeader.tsx` + CSS.
2. Ajuste de `BuyerShell` e `SupplierShell` para alternar header/bottombar.
3. `ListCard` + `ListCardList` reutilizáveis.
4. Conversão das listagens para cards em mobile (uma por página, mesma sessão ou em PRs subsequentes — confirmar): Offers, Orders, Negotiations, Sales, Requests, Users do buyer e supplier.
5. Validação visual em 360–414px e em rotas stack (verificar back, título, ausência de bottombar).

Posso implementar tudo de uma vez, ou começar pela infra (1–3) + 1 listagem piloto (ex: Buyer Offers) para validarmos o padrão antes de replicar — me diga a preferência ao aprovar.
