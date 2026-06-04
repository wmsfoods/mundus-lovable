## Problema

Ao reativar uma offer, o toggle liga e depois volta sozinho. Causa: o handler `openToggle` em `src/pages/supplier/OfferDetail.tsx` só altera estado local (`setActive(true)`) e **não persiste no banco**. No próximo refresh do hook, `status` continua `"inactive"` e a UI reverte.

## Correção

Em `src/pages/supplier/OfferDetail.tsx`, no branch de ativação do `openToggle`:

1. Fazer `UPDATE offers SET status='active' WHERE id = :id` antes de atualizar o estado local.
2. Em caso de erro do Supabase: `toast.error(...)` e **não** flipar o toggle.
3. Em caso de sucesso: `setActive(true)`, `toast.success("Offer reactivated.")` e `auditLog({ action: "offer.reactivated", ... })`.
4. Adicionar um flag `activating` (igual ao `deactivating`) para evitar duplo clique.

Nenhuma outra mudança — sem migration, sem alteração de RLS (a policy de UPDATE em `offers` já funciona, pois a deactivação usa o mesmo caminho).

## Checagem pós-fix

- Reativar uma offer inactive → status no DB vira `active`, card aparece em "Available", refresh não reverte.
- Erro de rede/RLS → toast vermelho e toggle permanece off.