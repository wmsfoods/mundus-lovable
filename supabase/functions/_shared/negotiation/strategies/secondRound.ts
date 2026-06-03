import { NEGOTIATION_PARAMETERS } from '../parameters.ts';
import type { CounterProposalInput, CounterProposalOutput, NegotiationStrategy } from '../types.ts';
import { average, calculateNonNegotiableLimit, isProposalWithinMarginFromTop } from './base.ts';

export const secondRoundStrategy: NegotiationStrategy = {
  round: 2,
  generate(input: CounterProposalInput): CounterProposalOutput {
    const { offerPrice, minimumPrice, proposal } = input;
    const previousProposal = lastOrThrow(input.previousProposals, 'proposal');
    const previousCounter = lastOrThrow(input.previousCounterProposals, 'counter');
    const margin = offerPrice - minimumPrice;
    const nonNegotiableLimit = calculateNonNegotiableLimit(minimumPrice, margin);

    if (proposal < nonNegotiableLimit) {
      return { price: previousCounter, explanation: 'Your proposal is too low and outside our negotiation range. We maintain our original offer.', rule: 'R0', isFinal: false };
    }
    if (isProposalWithinMarginFromTop(proposal, offerPrice, margin, NEGOTIATION_PARAMETERS.SECOND_ROUND_CLOSE_THRESHOLD)) {
      return { price: proposal, explanation: 'In the second round, the proposal is close enough to our offer price to accept.', rule: 'R2.A', isFinal: true };
    }
    const buyerConcession = proposal - previousProposal;
    if (buyerConcession <= NEGOTIATION_PARAMETERS.SMALL_CONCESSION_THRESHOLD * margin) {
      return { price: previousCounter - buyerConcession, explanation: 'Buyer conceded very little in the second round. Hardening our position and conceding proportionally.', rule: 'R2.B', isFinal: false };
    }
    if (isProposalWithinMarginFromTop(proposal, offerPrice, margin, NEGOTIATION_PARAMETERS.SECOND_ROUND_GOOD_PROPOSAL_THRESHOLD)) {
      return { price: average(proposal, previousCounter), explanation: 'Within negotiation margin, offering the middle ground to show goodwill and improve the sale value.', rule: 'R2.C', isFinal: false };
    }
    if (buyerConcession >= NEGOTIATION_PARAMETERS.SIGNIFICANT_CONCESSION_THRESHOLD * margin) {
      return { price: previousCounter - NEGOTIATION_PARAMETERS.GOOD_DISCOUNT_AMOUNT * margin, explanation: 'Buyer conceded significantly but still has a low proposal. Offering a good discount to encourage continued negotiation.', rule: 'R2.D', isFinal: false };
    }
    return { price: previousCounter - NEGOTIATION_PARAMETERS.SMALL_DISCOUNT_AMOUNT * margin, explanation: "Buyer didn't concede much and hasn't reached a good value. Offering a small discount to show goodwill.", rule: 'R2.E', isFinal: false };
  },
};

function lastOrThrow(arr: readonly number[], label: string): number {
  const v = arr.at(-1);
  if (v === undefined) throw new Error(`Invariant violated: secondRoundStrategy called without a previous ${label}`);
  return v;
}
