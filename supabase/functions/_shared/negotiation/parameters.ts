/**
 * Parâmetros do algoritmo de negociação.
 *
 * Estes números vieram do Mundus original (`NegotiationParameters.cs`).
 * São constantes de "calibragem" — mexer aqui muda o comportamento global
 * do engine sem precisar tocar nas regras.
 *
 * Convenções:
 *   - `Threshold` = fração da margem (margem = price - minimumPrice).
 *     Quanto MAIOR o threshold, MAIS PERMISSIVA a regra (engine aceita propostas
 *     mais distantes do preço cheio).
 *   - `DiscountAmount` = fração da margem que o engine concede ao buyer.
 */
export const NEGOTIATION_PARAMETERS = {
  /** Multiplicador da margem que define o "chão absoluto". Propostas abaixo de
   *  `minimumPrice - NON_NEGOTIABLE_LIMIT_FACTOR * margin` são rejeitadas sem
   *  contrapropor (engine mantém a oferta original). */
  NON_NEGOTIABLE_LIMIT_FACTOR: 2,

  // ─── Rodada 1 ───────────────────────────────────────────────────────────
  FIRST_ROUND_CLOSE_THRESHOLD: 0.2,
  FIRST_ROUND_COUNTER_THRESHOLD: 0.8,
  FIRST_ROUND_GOOD_OFFER_THRESHOLD: 0.4,
  FIRST_TIME_NEGOTIATOR_DISCOUNT: 0.4,
  RETURNING_NEGOTIATOR_DISCOUNT: 0.2,
  DEFAULT_SMALL_DISCOUNT: 0.1,

  // ─── Rodada 2 ───────────────────────────────────────────────────────────
  SECOND_ROUND_CLOSE_THRESHOLD: 0.3,
  SMALL_CONCESSION_THRESHOLD: 0.1,
  SECOND_ROUND_GOOD_PROPOSAL_THRESHOLD: 0.8,
  SIGNIFICANT_CONCESSION_THRESHOLD: 0.5,
  GOOD_DISCOUNT_AMOUNT: 0.3,
  SMALL_DISCOUNT_AMOUNT: 0.1,

  // ─── Rodada 3 (final — toda saída é isFinal=true) ───────────────────────
  THIRD_ROUND_CLOSE_THRESHOLD: 0.4,
  THIRD_ROUND_SIGNIFICANT_CONCESSION_THRESHOLD: 0.5,
  THIRD_ROUND_GOOD_PROPOSAL_THRESHOLD: 0.8,
  THIRD_ROUND_SMALL_DISCOUNT_AMOUNT: 0.1,
  THIRD_ROUND_GOOD_DISCOUNT_AMOUNT: 0.3,
} as const;

export const MAX_ROUNDS = 3 as const;
