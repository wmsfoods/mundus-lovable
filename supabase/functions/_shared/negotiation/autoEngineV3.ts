/**
 * Auto negotiation engine V3 — first-principles math, zero magic constants.
 *
 * Faratin's time-dependent concession curve family with canonical β values
 * for the three negotiation styles, plus a tit-for-tat hint that rewards
 * buyer movement. Floor buffer derived from curve geometry.
 *
 * Constants are DERIVED, not chosen:
 *   β ∈ {1/e, 1, e}    canonical Boulware/Linear/Conceder (Faratin 1998)
 *   ε  = m/(4T)         floor buffer = 1/4 of average concession step
 *   γ  = 1/T            tit-for-tat strength = 1/cycles
 *   T  = 4              cycles (business rule)
 */
export type Dial = 'protect_margin' | 'balanced' | 'win_deal';

const T = 4 as const;
const BETA: Record<Dial, number> = {
  protect_margin: 1 / Math.E,
  balanced:       1,
  win_deal:       Math.E,
};

export interface AutoInput {
  offerPrice: number;
  minimumPrice: number;
  bid: number;
  prevBid: number | null;
  prevCounter: number | null;
  cycle: 1 | 2 | 3 | 4;
  dial: Dial;
}

export interface AutoDiagnostics {
  margin: number;
  epsilon: number;
  effectiveFloor: number;
  beta: number;
  psi: number;
  cCurve: number;
  rho: number;
  cFinal: number;
  cClamped: number;
  concessionPct: number;
}

export interface AutoOutput {
  price: number;
  decision: 'counter' | 'accept_bid' | 'hold';
  rule: string;
  isFinal: boolean;
  explanation: string;
  diagnostics: AutoDiagnostics;
}

export function autoCounter(inp: AutoInput): AutoOutput {
  const { offerPrice: a, minimumPrice: f, bid: b, prevBid, prevCounter, cycle: t, dial } = inp;
  const m = a - f;
  const beta = BETA[dial];
  const epsilon = m / (4 * T);
  const fEff = f + epsilon;
  const mEff = a - fEff;
  const isFinal = t === T;

  const baseDiag = (extra: Partial<AutoDiagnostics>): AutoDiagnostics => ({
    margin: m, epsilon, effectiveFloor: fEff, beta,
    psi: 0, cCurve: a, rho: 0, cFinal: a, cClamped: a, concessionPct: 0,
    ...extra,
  });

  if (b >= a) {
    return { price: b, decision: 'accept_bid', rule: 'ACCEPT_ABOVE_ASKING',
      isFinal: true, explanation: 'Buyer matched or exceeded asking.',
      diagnostics: baseDiag({ cFinal: b, cClamped: b }) };
  }
  if (b < f - m) {
    const hold = prevCounter ?? a;
    return { price: hold, decision: 'hold', rule: 'HOLD_TOO_LOW', isFinal,
      explanation: 'Bid outside ZOPA. Holding.',
      diagnostics: baseDiag({ cCurve: hold, cFinal: hold, cClamped: hold, concessionPct: (a - hold) / m }) };
  }

  const psi = Math.pow(t / T, 1 / beta);
  const cCurve = a - mEff * psi;
  const rho = prevBid != null ? Math.max(0, Math.min(1, (b - prevBid) / m)) : 0;
  const cFinal = cCurve * (1 - rho / T);

  let c = cFinal;
  if (prevCounter != null) c = Math.min(c, prevCounter);
  c = Math.max(c, fEff);

  if (c <= b + epsilon) {
    return { price: b, decision: 'accept_bid', rule: 'ACCEPT_GAP_TOO_SMALL',
      isFinal: true, explanation: `Counter within ε ($${epsilon.toFixed(4)}/kg) of bid.`,
      diagnostics: baseDiag({ psi, cCurve, rho, cFinal, cClamped: c, concessionPct: (a - b) / m }) };
  }

  c = Math.round(c * 10000) / 10000;
  return { price: c, decision: 'counter', rule: `R${t}_${dial.toUpperCase()}`,
    isFinal, explanation: `Cycle ${t}/${T} ${dial} (β=${beta.toFixed(3)}).`,
    diagnostics: baseDiag({ psi, cCurve, rho, cFinal, cClamped: c, concessionPct: (a - c) / m }) };
}