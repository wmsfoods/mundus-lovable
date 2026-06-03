/**
 * Auto negotiation engine V2 — Fase 2.
 *
 * Concept: a negotiation has up to 4 CYCLES. Each cycle = 1 buyer bid + 1
 * engine counter (2 movements in `round_proposals`). Cycle 4 is FINAL.
 * Total movements cap at 8.
 */
export type Dial = 'protect_margin' | 'balanced' | 'win_deal';

// Spread (Gumbel scale) as fraction of margin per cycle. Bigger early, smaller late.
const S_FRAC: Record<number, number> = { 1: 0.35, 2: 0.25, 3: 0.18, 4: 0.12 };

// Acceptance probability threshold by dial × cycle. LOWER tau = more aggressive counter (closer to asking).
const TAU: Record<Dial, Record<number, number>> = {
  protect_margin: { 1: 0.35, 2: 0.45, 3: 0.55, 4: 0.65 },
  balanced:       { 1: 0.45, 2: 0.55, 3: 0.65, 4: 0.75 },
  win_deal:       { 1: 0.55, 2: 0.65, 3: 0.75, 4: 0.85 },
};

// Bid below (floor - NON_NEG_FACTOR × margin) → HOLD (don't budge)
const NON_NEG_FACTOR = 2.0;

function theta(cycle: number, concRatio: number): number {
  if (cycle === 1) return 0.5;
  return Math.max(0.1, Math.min(0.5, (0.5 * concRatio) / 0.2));
}

export interface AutoInput {
  offerPrice: number;       // asking ($/kg)
  minimumPrice: number;     // floor ($/kg) — never reveal
  bid: number;              // current bid ($/kg)
  prevBid: number | null;
  prevCounter: number | null;
  cycle: 1 | 2 | 3 | 4;
  dial: Dial;
}
export interface AutoOutput {
  price: number;
  decision: 'counter' | 'accept_bid' | 'hold';
  rule: string;
  isFinal: boolean;
  explanation: string;
}

export function autoCounter(inp: AutoInput): AutoOutput {
  const { offerPrice, minimumPrice, bid, prevBid, prevCounter, cycle, dial } = inp;
  const margin = offerPrice - minimumPrice;
  const s = margin * S_FRAC[cycle];
  const tau = TAU[dial][cycle];
  const isFinal = cycle === 4;
  const nonNeg = minimumPrice - NON_NEG_FACTOR * margin;

  // CASE 1: bid ≥ asking → engine accepts the buyer's price
  if (bid >= offerPrice) {
    return {
      price: bid, decision: 'accept_bid', rule: 'ACCEPT_ABOVE_ASKING', isFinal: true,
      explanation: 'Buyer matched or exceeded asking — deal accepted at buyer price.'
    };
  }

  // CASE 2: bid absurdly low (below floor - 2×margin) → HOLD
  if (bid < nonNeg) {
    const hold = prevCounter ?? offerPrice;
    return {
      price: hold, decision: 'hold', rule: 'HOLD_TOO_LOW', isFinal,
      explanation: 'Bid is outside our negotiation range. Holding position.'
    };
  }

  // CASE 3: normal counter math (Gumbel-style)
  const concRatio = prevBid == null ? 0 : Math.max(0, (bid - prevBid) / margin);
  const th = theta(cycle, cycle > 1 ? concRatio : 0);
  const mu = bid + th * (offerPrice - bid);
  let c = mu + s * Math.log((1 - tau) / tau);

  // Clamp: never above asking, never above previous counter (monotonic descent)
  c = Math.min(c, offerPrice);
  if (prevCounter != null) c = Math.min(c, prevCounter);

  // Floor cushion: never reveal minimum_price.
  const FLOOR_BUFFER = Math.max(0.01, 0.10 * margin);
  c = Math.max(c, minimumPrice + FLOOR_BUFFER);

  // If clamped counter is at or below bid, accept the bid.
  if (c <= bid) {
    return {
      price: bid, decision: 'accept_bid', rule: 'ACCEPT_CLAMP', isFinal: true,
      explanation: 'Our counter would meet your bid. Deal accepted.'
    };
  }

  c = Math.round(c * 10000) / 10000;
  return {
    price: c, decision: 'counter', rule: `R${cycle}_${dial.toUpperCase()}`, isFinal,
    explanation: `Counter-offer at cycle ${cycle} (${dial}).`
  };
}