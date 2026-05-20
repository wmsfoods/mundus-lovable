# Diagnóstico da barra fininha no topo

## O que verifiquei
- Não existe `NProgress`, `TopLoader`, `LinearProgress` fixo, nem componente de progress bar global no projeto.
- Toda a navegação do admin (`Sidebar`, `MobileDrawer`, `BottomNav`) usa `NavLink` do React Router — não há `<a href>` nem `window.location` causando full reload.
- Não há `@keyframes` de barra deslizante no CSS (só animação do drawer de prospect).
- Nenhuma rota usa `React.lazy` + `Suspense` no `App.tsx`, então não há fallback global.
- O console mostra `[vite] server connection lost. Polling for restart...` — sinal de que o HMR do Vite às vezes desconecta e reconecta.

## Hipótese principal
A barra fininha animada que aparece no topo **não é do seu app** — é o indicador de carregamento do **iframe do preview do Lovable** (a plataforma exibe uma barra de progresso no topo do iframe enquanto a URL recarrega/troca). Quando o Vite HMR cai e reconecta, o iframe recarrega → a barra aparece e some.

Para confirmar: abrir a versão publicada (`https://mundus-lovable.lovable.app`) em uma aba normal do navegador (fora do preview do Lovable) e navegar entre `/admin/dashboard` → `/admin/settings/flags`. Se a barrinha **não** aparecer ali, é 100% a barra do preview do Lovable e não há nada a corrigir no app.

## Hipótese secundária (caso confirme que é dentro do app)
Pode haver alguma extensão de browser, um banner injetado pela rota `/admin`, ou um reload causado por `useEffect` que dispara `navigate` repetidamente. Nesse caso eu precisaria de:
- Screenshot do momento exato em que a barra aparece, ou
- Vídeo curto da navegação na versão publicada.

## Próximos passos sugeridos
1. Você testa na URL publicada e me diz se a barra continua aparecendo.
2. Se **sim**: me envia um screenshot/vídeo curto para eu identificar o elemento e remover.
3. Se **não**: é só o indicador da plataforma de preview — nada para corrigir no código.

Não vou modificar nada agora porque qualquer mudança às cegas pode quebrar comportamento real sem resolver o que te incomoda.
