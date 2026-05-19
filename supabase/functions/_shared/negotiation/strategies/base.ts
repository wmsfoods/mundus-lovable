import { NEGOTIATION_PARAMETERS } from '../parameters.ts';

export function calculateNonNegotiableLimit(minimumPrice: number, margin: number): number {
  return minimumPrice - NEGOTIATION_PARAMETERS.NON_NEGOTIABLE_LIMIT_FACTOR * margin;
}

export function isProposalWithinMarginFromTop(
  proposal: number, offerPrice: number, margin: number, threshold: number
): boolean {
  return proposal >= offerPrice - threshold * margin;
}

export function isProposalCloseToMinimum(
  proposal: number, minimumPrice: number, margin: number, threshold: number
): boolean {
  return proposal >= minimumPrice - threshold * margin;
}

export function average(a: number, b: number): number {
  return (a + b) / 2;
}

export function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}
