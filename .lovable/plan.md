## Problem

No campo "Número de Containers (FCL)" do Create Offer (supplier), o valor "1" não sai quando o usuário digita. Digitar "2" resulta em "12", digitar "3" funciona por acaso só porque o cursor está depois. Causa: o input usa fallback `value={containers || 1}` e `parseInt(...) || 1`, então estado nunca aceita string vazia — o "1" permanece e o dígito digitado concatena.

## Fix

Em `SupplierCreateOfferV2Desktop.tsx` e `SupplierCreateOfferV2Mobile.tsx`, no input de containers:

1. Permitir string vazia durante a edição (estado local string, não forçar fallback no `value`).
2. `onChange` aceita apenas dígitos e atualiza livremente (inclui vazio).
3. `onBlur` normaliza: se vazio ou < 1, vira `1`; senão, mantém o número digitado.
4. Conversão para número só na hora de submeter/usar no cálculo (`Number(containers) || 1`).

Sem mudanças em lógica de negócio, banco, ou outros campos.

## Validação

- Campo começa com "1".
- Selecionar tudo e digitar "2" → mostra "2".
- Apagar e digitar "3" → mostra "3".
- Sair do campo vazio → volta para "1".
- Submit usa o número correto.
