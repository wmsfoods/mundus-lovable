## Plano

3 entregas independentes, na ordem abaixo. Cada uma é pequena e verificável.

---

### 1) Logo novo em todo o sistema

- Copiar `user-uploads://MUNDUS_JOB_210_24_LOGO_ORIG-4.png` para `src/assets/mundus-logo.png` (sobrescreve o atual).
- Também copiar para `public/favicon.png` e atualizar `index.html` (favicon + meta).
- Reescrever `src/components/Logo.tsx` para renderizar o PNG (`<img>`) em vez do SVG montado à mão.
  - Props: `size?: "sm" | "md" | "lg"` (24 / 32 / 44 px de altura), `className?`.
  - Mantém a mesma assinatura, então `Login.tsx`, `Dashboard.tsx`, `SignupShell.tsx`, `Topbar.tsx`, `Sidebar.tsx` continuam funcionando sem mexer no resto.
- Remover o prop `variant="white"` (não faz mais sentido com PNG colorido). Quem usava em fundo escuro vai usar o mesmo PNG — o logo tem boa legibilidade.

---

### 2) i18n EN / PT / ES — traduzindo o que já existe

**Stack:** `i18next` + `react-i18next` + `i18next-browser-languagedetector` (detecta idioma do navegador, persiste em `localStorage`).

**Arquivos novos:**
```text
src/i18n/
  index.ts                # config do i18next, init
  locales/
    en.json
    pt.json
    es.json
```

**Estrutura das chaves** (namespaces por área para evitar JSON gigante):
```json
{
  "common": { "save": "...", "cancel": "...", "loading": "..." },
  "auth":   { "login.title": "...", "login.email": "..." },
  "signup": { ... },
  "shell":  { "nav.home": "...", "nav.offers": "...", "logout": "..." },
  "buyer":  { "home.greeting": "...", "offers.title": "..." }
}
```

**Hook de uso:** `const { t } = useTranslation();` e `t("auth.login.title")`.

**Trocar idioma:** o chip "English" do `Topbar` vira um dropdown com EN/PT/ES. Idioma escolhido grava em `localStorage` e chama `i18n.changeLanguage()`.

**Telas que serão traduzidas neste commit:**
- `Login`
- `Signup`, `SignupSuccess`, `PartnerSignup`
- `Dashboard` (legado)
- `Sidebar` + `Topbar`
- `Buyer/Home` (hero, KPIs, action cards, seção)
- `Buyer/Offers` (header, "Showing X results", empty/error states, card status pills)
- `Buyer/OfferDetail` (gallery, cuts table headers, terms, FCL info, botões)
- `ComingSoon`
- `DevIndex` (admin, mas vamos traduzir junto)

**Tradução do conteúdo dinâmico do banco** (nomes de produtos, países, etc.):
- Países já têm `english_name`, `portuguese_name`, `spanish_name` — usar conforme idioma ativo.
- `standard_product_names` tem `culture_code` → query usa o idioma ativo.
- `product_categories` tem `name_en/pt/es` → idem.
- Isso vai ser ajustado nos hooks `useOffers` / `useOffer` pra retornar a string no idioma certo.

**Texto que NÃO se traduz** (por ora): status técnicos vindos do banco (`pending_supplier`, etc.) ficam mapeados num dicionário em `shell` ou `buyer`.

---

### 3) Shell mobile-first (bottom nav + drawer)

Hoje `BuyerShell`/`SupplierShell` usam grid desktop com sidebar fixa de 240px. Vou refatorar pra responder ao breakpoint:

**Desktop (≥1024px):** mantém o layout atual — sidebar à esquerda + topbar + main.

**Mobile (<1024px):**
- **Topbar enxuta** (altura ~56px, safe-area top): logo à esquerda, sino + avatar à direita. Sem chip de idioma/unidade (esses vão pro drawer).
- **Bottom nav fixa** (safe-area bottom): 5 ícones — Home, Offers, Create (centro destacado, accent), Negotiations, Mais.
  - Buyer: Home / Offers / Create Request / Negotiations / Mais
  - Supplier: Home / My Offers / Create Offer / Negotiations / Mais
- **Drawer lateral** acionado pelo botão "Mais": lista completa do menu + idioma + unidade + logout. Animado de baixo pra cima ou da direita pra esquerda.
- **Conteúdo** com `padding-bottom: calc(64px + env(safe-area-inset-bottom))` pra não ficar atrás da bottom nav.

**Novos arquivos / mudanças:**
```text
src/components/mundus/BottomNav.tsx        # nova
src/components/mundus/MobileDrawer.tsx     # nova
src/components/mundus/Sidebar.tsx          # ajustes: esconde em <1024px
src/components/mundus/Topbar.tsx           # 2 layouts (mobile/desktop)
src/styles/mundus-shell.css                # tokens responsivos + safe-area
src/layouts/BuyerShell.tsx                 # estrutura nova
src/layouts/SupplierShell.tsx              # idem
```

**Princípios mobile** (já está na memória do projeto, vou seguir à risca):
- Toques ≥44px de altura
- Espaçamentos consistentes
- Respeitar `env(safe-area-inset-*)`
- Sem tabelas — cards verticais
- Validar em iPhone (375px) e Android (360px)

**Páginas internas (Home/Offers/OfferDetail)** vão precisar de pequenos ajustes responsivos:
- `Buyer/Home`: KPI strip vira carrossel horizontal de cards em mobile, action cards empilham 1 coluna, hero diminui padding.
- `Buyer/Offers`: grid de 3 colunas → 1 coluna, breadcrumb compacta.
- `Buyer/OfferDetail`: layout 2 colunas vira stack, cuts "table" vira lista de cards, botões viram sticky bottom bar acima da bottom nav.

---

## Como vamos validar

- Logo: visual em Login, Dashboard, Sidebar, Topbar — desktop e mobile.
- i18n: trocar idioma no Topbar e ver todas as telas mudarem; recarregar e confirmar que persiste.
- Mobile: viewport 375×812 e 360×800 — bottom nav visível, drawer abre, conteúdo não fica atrás dela, safe-area respeitada.

## Ordem de execução

1. Logo (commit pequeno, sem risco) — **C8a**
2. i18n setup + tradução de todas as telas — **C8b**
3. Shell mobile (bottom nav + drawer + ajustes de página) — **C8c**

Posso fazer os três num único turno ou parar entre cada um pra você revisar. Sugiro **um turno por commit** porque o mobile vai mexer em muito CSS e fica mais fácil de revisar separado.

## Itens técnicos pra você ficar ciente

- A coluna `users.preferred_language` já existe — vou usar ela como fonte da verdade do idioma do usuário logado (sobrescreve a detecção do navegador).
- Bottom nav usa `position: fixed` + `env(safe-area-inset-bottom)` — funciona em iOS standalone (PWA) também.
- Vou aproveitar e adicionar `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />` no `index.html` se ainda não tiver, pra safe-area funcionar.
- O `Dashboard.tsx` legado fica intacto na estrutura — só vou traduzir os textos.
