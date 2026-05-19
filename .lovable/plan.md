# C8c — Mobile-first shell

Objetivo: transformar a app em "pocket version" no celular, mantendo o desktop exatamente como está hoje.

Breakpoint único: **1024px**.
- `≥ 1024px` (desktop): layout atual (sidebar lateral + topbar + main).
- `< 1024px` (mobile/tablet pequeno): topbar enxuta + conteúdo + bottom nav fixo + drawer lateral.

## 1. Estrutura nova

```text
src/
  layouts/
    BuyerShell.tsx        (refatorado)
    SupplierShell.tsx     (refatorado)
  components/mundus/
    Sidebar.tsx           (esconde abaixo de 1024px)
    Topbar.tsx            (2 layouts: desktop completo / mobile enxuto)
    BottomNav.tsx         (novo — só mobile)
    MobileDrawer.tsx      (novo — só mobile, deslizante da esquerda)
  styles/
    mundus-shell.css      (novas regras responsivas)
  hooks/
    useIsMobile.ts        (reutiliza ou cria — matchMedia 1024px)
```

## 2. Topbar mobile (~56px de altura)

Conteúdo mínimo, da esquerda para a direita:
- Logo Mundus (compacto, altura ~28px)
- Espaço flexível
- Seletor de idioma (compacto, só "EN/PT/ES" + ícone globo)
- Sino de notificações
- Avatar (abre menu com email + Sair)

Sem o seletor de unidade (`kg`) no mobile — vai para o drawer.

## 3. Bottom Nav (5 ícones fixos)

Fixo no rodapé, respeitando `env(safe-area-inset-bottom)` (iPhone com barra de gestos).
Altura ~64px + safe area. Ícone (24px) + label curta (11px).

**Buyer:**
| Ícone | Label | Rota |
|---|---|---|
| Home | Início | `/buyer` |
| Tag | Ofertas | `/buyer/offers` |
| **Plus** (destacado, círculo accent #B64769) | Criar | `/buyer/requests/new` |
| Message | Negoc. | `/buyer/negotiations` |
| Menu (3 linhas) | Mais | abre drawer |

**Supplier:**
| Ícone | Label | Rota |
|---|---|---|
| Home | Início | `/supplier` |
| Tag | Ofertas | `/supplier/offers` |
| **Plus** (destacado) | Criar | `/supplier/offers/new` |
| Message | Negoc. | `/supplier/negotiations` |
| Menu | Mais | abre drawer |

Item ativo: ícone + label em accent (#B64769). Touch target ≥ 44px.

## 4. Mobile Drawer (acionado pelo "Mais")

Painel deslizante da esquerda (largura ~280px), com overlay escuro.
- Cabeçalho: logo + nome do usuário + email + role pill.
- Lista completa dos itens secundários da role (os que não cabem no bottom nav: Customers, Requests, Orders, Users, Sales, Offer Requests).
- Rodapé: seletor de idioma (linha), seletor de unidade (linha), botão "Sair".
- Fecha ao tocar overlay, ao trocar de rota, ou via X no topo.
- Animação 200ms ease-out.

## 5. Conteúdo (`main`) no mobile

- Padding lateral 16px (hoje é maior).
- `padding-bottom` extra = altura do bottom nav + safe-area, para o último item não ficar coberto.
- `padding-top` extra = altura da topbar fixa.

## 6. Ajustes nas páginas internas (responsivos)

Verificar que continuam fluidas no mobile (não vou reescrever, só garantir):
- **Buyer Home**: stats já em grid — passa para 2 colunas no mobile, hero stack vertical, action-row 1 coluna.
- **Buyer Offers**: cards em 1 coluna no mobile (já parece estar próximo via `.card-row`).
- **Buyer Offer Detail**: galeria empilha em cima, conteúdo em baixo (1 coluna). Botões "Negotiate" / "Place Order" sticky no rodapé acima do bottom nav.
- **Login** e **Signup**: já tinham tratamento mobile — não mexo.
- **Dashboard**: já é simples — só checar paddings.

## 7. CSS — princípios

- Touch targets ≥ 44px de altura.
- Espaçamentos consistentes via tokens (`--space-3`, `--space-4` etc., reaproveitar o que existir).
- `position: fixed` na topbar e bottom nav com z-index ordenado: drawer overlay > drawer panel > topbar > bottom nav > conteúdo.
- Usar `100dvh` ao invés de `100vh` onde aplicável (evita salto com a barra de URL do mobile).
- `env(safe-area-inset-top)` na topbar, `env(safe-area-inset-bottom)` no bottom nav.

## 8. Acessibilidade e UX

- Sem overlay de scroll horizontal — `overflow-x: hidden` no `<body>` em mobile.
- Bottom nav e drawer com `aria-label`s claros.
- Foco visível em navegação por teclado (mesmo sendo mobile-first).
- Active route do bottom nav e drawer alinhada com `NavLink` (mesma lógica da sidebar).

## 9. Validação

Vou abrir no preview e checar:
- Desktop ≥ 1024px: idêntico ao que está hoje (sidebar visível, sem bottom nav).
- Tablet 768px: bottom nav ativo, drawer funciona.
- iPhone 12 (390×844): topbar, conteúdo, bottom nav, todas safe-areas respeitadas.
- Galaxy S20 (360×800): cabe tudo sem cortes.
- Rotacionar Home → Offers → Offer Detail → "Mais" → drawer → item → fecha drawer e navega.
- Trocar idioma do drawer reflete em todo o app.

## 10. O que NÃO entra neste commit

- Notificações reais (sino continua decorativo).
- Telas internas novas (Customers, Negotiations, Orders) — continuam apontando para rotas que mostram 404/ComingSoon como hoje; só ficam navegáveis pelo drawer.
- Mudanças na sidebar do desktop.

## 11. Detalhes técnicos (curtos)

- `useIsMobile()`: hook com `window.matchMedia('(max-width: 1023px)')` + listener; SSR-safe default `false`.
- `MobileDrawer`: portal em `document.body`, lock de scroll do body enquanto aberto, ESC fecha.
- `BottomNav` e `Topbar` mobile renderizam condicionalmente via `useIsMobile()` para evitar render desnecessário no desktop.
- Logo no mobile usa o mesmo `Logo` PNG mas com `size="sm"`.