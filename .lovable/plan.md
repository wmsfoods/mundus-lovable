## Diagnóstico

- A falha principal está no desktop: em modo `edit`, o botão **Save changes** chama o mesmo caminho de **Publish** (`handleSubmit("active")`).
- Por isso, uma oferta que era `draft` pode virar `active` apenas ao salvar alterações.
- A validação de publicação no código existe, mas está mais fraca que o medidor de 100%: ela não cobre todos os pontos que a UI marca como obrigatórios, como portas de destino/frete.
- A oferta `#M-000134-2026` está hoje como `active` no banco; a investigação mostra 1 item registrado nela, mas ela passou pelo fluxo problemático que permite promover draft sem intenção explícita.

## Plano de correção

1. **Separar claramente os intents do fluxo**
  - `Save draft` / `Save changes` em uma oferta que ainda é draft sempre salva como `draft`.
  - Somente o botão explícito **Publish / Make available** pode enviar `status: active`.
  - Em oferta já ativa, `Save changes` pode manter `active`, Mas só se continuar 100% válida.
2. **Ajustar a ActionBar do Create Offer desktop**
  - Quando editar uma oferta `draft`, mostrar ações separadas:
    - **Save draft**
    - **Publish** apenas quando estiver 100% completa
  - Quando editar uma oferta `active`, manter "**Save changes"**, mas bloquear se a oferta ficar incompleta.
  - Usar o status original vindo do prefill (`draft`/`active`) Para decidir o comportamento correto.
3. **Reforçar a validação de publicação no código**
  - Centralizar a regra: publicar exige que as mesmas seções obrigatórias estejam completas.
  - Bloquear publicação quando faltarem itens, pagamento, distribuição, incoterm, origem, destinos com portas e frete aplicável.
  - Draft continua aceitando campos incompletos.
4. **Adicionar uma proteção no banco para evitar publicação inválida**
  - Criar uma função/trigger de segurança para impedir que uma oferta vire `active` se não tiver os dados mínimos relacionados, como itens, Incoterms, mercados/destinos, portas de origem e payment terms.
  - Ajustar o fluxo técnico para salvar primeiro como draft e só ativar no final, depois que os registros filhos estiverem gravados.
  - Isso evita que outro bug ou chamada direta publique uma oferta incompleta.
5. **Corrigir a oferta #M-000134-2026 se necessário**
  - Após a correção, revisar novamente a oferta.
  - Se ela não cumprir a regra completa, volta para `draft`; se cumprir, pode permanecer ativa.
6. **Validar o fluxo completo**
  - Novo draft incompleto: salva sem publicar.
  - Editar draft e clicar Save draft/Save changes: continua draft.
  - Editar draft e tentar Publish incompleto: bloqueia e mostra pendências.
  - Editar draft completo e clicar Publish: vira active.
  - Editar oferta ativa e remover campo obrigatório: não salva como active.