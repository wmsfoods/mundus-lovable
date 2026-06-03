export type Dial = 'protect_margin' | 'balanced' | 'win_deal';

/**
 * Auto negotiation engine V2.
 *
 * Concept: a negotiation has up to 3 CYCLES. Each cycle = 1 buyer bid + 1
 * engine counter (2 movements in `round_proposals`). So cycle 3 is the FINAL
 * exchange and total movements cap at 6. The numeric tables below (S_FRAC,
 * TAU) are indexed by cycle (1/2/3), not by raw round.
 */
const S_FRAC: Record<number, number> = { 1: 0.35, 2: 0.22, 3: 0.15 };
const TAU: Record<Dial, Record<number, number>> = {
  protect_margin: { 1: 0.50, 2: 0.50, 3: 0.62 },
  balanced:       { 1: 0.65, 2: 0.65, 3: 0.75 },
  win_deal:       { 1: 0.80, 2: 0.80, 3: 0.85 },
};
const NON_NEG_FACTOR = 2.0;

function theta(cycle: number, concRatio: number): number {
  if (cycle === 1) return 0.5;
  return Math.max(0.1, Math.min(0.5, (0.5 * concRatio) / 0.2));
}

export interface AutoInput {
  offerPrice: number; minimumPrice: number; bid: number;
  prevBid: number | null; prevCounter: number | null;
  /** Cycle of negotiation (1, 2 or 3). Each cycle = 1 buyer bid + 1 engine counter. Cycle 3 is FINAL. */
  cycle: 1 | 2 | 3; dial: Dial;
}
export interface AutoOutput {
  price: number; pAccept: number; rule: string; isFinal: boolean;
  decision: 'counter' | 'accept_bid' | 'hold'; explanation: string;
}

export function autoCounter(inp: AutoInput): AutoOutput {
  const { offerPrice, minimumPrice, bid, prevBid, prevCounter, cycle, dial } = inp;
  const margin = offerPrice - minimumPrice;
  const s = margin * S_FRAC[cycle];
  const tau = TAU[dial][cycle];
  const isFinal = cycle === 3;
  const nonNeg = minimumPrice - NON_NEG_FACTOR * margin;
  const pAcc = (c: number, mu: number) => 1 / (1 + Math.exp((c - mu) / s));

  if (bid < nonNeg) {
    const hold = prevCounter ?? offerPrice;
    return { price: hold, pAccept: pAcc(hold, bid + 0.5 * margin), rule: 'R0', isFinal,
      decision: 'hold', explanation: 'Your proposal is outside our negotiation range; we maintain our position.' };
  }
  const concRatio = prevBid == null ? 0 : Math.max(0, (bid - prevBid) / margin);
  const th = theta(cycle, cycle > 1 ? concRatio : 0);
  const mu = bid + th * (offerPrice - bid);
  let c = mu + s * Math.log((1 - tau) / tau);
  c = Math.min(c, offerPrice);
  if (prevCounter != null) c = Math.min(c, prevCounter);
  // Never reveal the minimum_price floor to the buyer. Keep a cushion above it.
  const FLOOR_BUFFER = Math.max(0.01, 0.10 * margin);
  c = Math.max(c, minimumPrice + FLOOR_BUFFER);
  if (c <= bid) {
    return { price: bid, pAccept: 1, rule: 'ACCEPT', isFinal: true, decision: 'accept_bid',
      explanation: 'Your proposal works for us — deal accepted.' };
  }
  c = Math.round(c * 10000) / 10000;
  return { price: c, pAccept: pAcc(c, mu), rule: `R${cycle}`, isFinal, decision: 'counter',
    explanation: 'Counter-offer based on the current negotiation context.' };
}