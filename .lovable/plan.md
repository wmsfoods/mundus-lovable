## Objetivo
Impedir que o usuário consiga dar zoom com pinch (gesto de pinça) no mobile.

## Mudança
Atualizar a meta tag `viewport` em `index.html` para bloquear escala do usuário:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

## Arquivo afetado
- `index.html` — apenas a meta viewport

## Observação
- `maximum-scale=1.0` + `user-scalable=no` desabilitam pinch-zoom em Android e iOS modernos (Safari iOS respeita essas flags desde iOS 10+ quando combinadas).
- Não afeta o layout responsivo já existente nem o desktop.
- Trade-off de acessibilidade: usuários que dependem de zoom do sistema perdem essa opção dentro da página. Se isso for uma preocupação, posso aplicar só em telas específicas via JS — me avisa.