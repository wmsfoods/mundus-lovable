export type Dial = 'protect_margin' | 'balanced' | 'win_deal';

const S_FRAC: Record<number, number> = { 1: 0.35, 2: 0.22, 3: 0.15 };
const TAU: Record<Dial, Record<number, number>> = {
  protect_margin: { 1: 0.50, 2: 0.50, 3: 0.62 },
  balanced:       { 1: 0.65, 2: 0.65, 3: 0.75 },
  win_deal:       { 1: 0.80, 2: 0.80, 3: 0.85 },
};
const NON_NEG_FACTOR = 2.0;

function theta(round: number, concRatio: number): number {
  if (round === 1) return 0.5;
  return Math.max(0.1, Math.min(0.5, (0.5 * concRatio) / 0.2));
}

export interface AutoInput {
  offerPrice: number; minimumPrice: number; bid: number;
  prevBid: number | null; prevCounter: number | null;
  round: 1 | 2 | 3; dial: Dial;
}
export interface AutoOutput {
  price: number; pAccept: number; rule: string; isFinal: boolean;
  decision: 'counter' | 'accept_bid' | 'hold'; explanation: string;
}

export function autoCounter(inp: AutoInput): AutoOutput {
  const { offerPrice, minimumPrice, bid, prevBid, prevCounter, round, dial } = inp;
  const margin = offerPrice - minimumPrice;
  const s = margin * S_FRAC[round];
  const tau = TAU[dial][round];
  const isFinal = round === 3;
  const nonNeg = minimumPrice - NON_NEG_FACTOR * margin;
  const pAcc = (c: number, mu: number) => 1 / (1 + Math.exp((c - mu) / s));

  if (bid < nonNeg) {
    const hold = prevCounter ?? offerPrice;
    return { price: hold, pAccept: pAcc(hold, bid + 0.5 * margin), rule: 'R0', isFinal,
      decision: 'hold', explanation: 'Your proposal is outside our negotiation range; we maintain our position.' };
  }
  const concRatio = prevBid == null ? 0 : Math.max(0, (bid - prevBid) / margin);
  const th = theta(round, round > 1 ? concRatio : 0);
  const mu = bid + th * (offerPrice - bid);
  let c = mu + s * Math.log((1 - tau) / tau);
  c = Math.min(c, offerPrice);
  if (prevCounter != null) c = Math.min(c, prevCounter);
  c = Math.max(c, minimumPrice);
  if (c <= bid) {
    return { price: bid, pAccept: 1, rule: 'ACCEPT', isFinal: true, decision: 'accept_bid',
      explanation: 'Your proposal works for us — deal accepted.' };
  }
  c = Math.round(c * 10000) / 10000;
  return { price: c, pAccept: pAcc(c, mu), rule: `R${round}`, isFinal, decision: 'counter',
    explanation: 'Counter-offer based on the current negotiation context.' };
}