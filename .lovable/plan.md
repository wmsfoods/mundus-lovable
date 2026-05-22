# Alinhar espaçamento lateral mobile

## Problema
No mobile, o conteúdo (`.app-main`) usa **16px** de padding lateral, enquanto:
- A bottom nav (`.bn`) usa **4px** + grid 1fr (ícones ficam quase encostados na borda visual da tela)
- O `StackHeader` usa **8px** lateral
- O `Topbar` mobile usa **12px**

Resultado: o conteúdo aparece visivelmente mais "encolhido" para dentro do que os ícones da navbar e o título do header, criando desalinhamento.

## Solução
Padronizar o gutter lateral mobile em **12px** em todas as superfícies do shell, batendo com o Topbar e ficando alinhado com a área visual da bottom nav.

### Alterações em `src/styles/mundus-shell.css`
- `.app-main` (media `max-width: 1023px`): `padding: 16px 16px ...` → `padding: 12px 12px calc(72px + env(safe-area-inset-bottom))`
- Manter `.tb` mobile em 12px (já está)

### Alterações em `src/styles/mundus-stack-header.css`
- `.stack-header` mobile: `padding: env(safe-area-inset-top) 8px 0 8px` → `12px`
- Conteúdo interno (`padding: 16px 16px ...`) → `12px 12px ...` para alinhar com `.app-main`

### Bottom nav
- `.bn` continua com `padding: 6px 4px ...` (ícones ficam centralizados nas células 1fr, então o "edge visual" do primeiro/último ícone fica próximo de 12px em telas de ~390px, alinhando naturalmente com o novo gutter do conteúdo)

## Escopo
Só CSS de shell/header. Não toca em páginas individuais nem em lógica. Cards/listas dentro das páginas já usam padding próprio e continuarão funcionando — só vão respirar 4px a mais nas laterais, que é o objetivo.

## Verificação
Abrir no preview 390x844:
- `/buyer/requests`, `/buyer/requests/new`, `/buyer/negotiations/:id`, `/supplier/offers`
- Confirmar que a borda esquerda do conteúdo alinha visualmente com o ícone mais à esquerda da bottom nav e com o botão "voltar" do StackHeader.
