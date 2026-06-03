import { NEGOTIATION_PARAMETERS } from '../parameters.ts';
import type { CounterProposalInput, CounterProposalOutput, NegotiationStrategy } from '../types.ts';
import { average, calculateNonNegotiableLimit, isProposalWithinMarginFromTop } from './base.ts';

export const thirdRoundStrategy: NegotiationStrategy = {
  round: 3,
  generate(input: CounterProposalInput): CounterProposalOutput {
    const { offerPrice, minimumPrice, proposal } = input;
    const firstProposal = firstOrThrow(input.previousProposals);
    const previousProposal = lastOrThrow(input.previousProposals, 'proposal');
    const previousCounter = lastOrThrow(input.previousCounterProposals, 'counter');
    const margin = offerPrice - minimumPrice;
    const nonNegotiableLimit = calculateNonNegotiableLimit(minimumPrice, margin);

    if (proposal < nonNegotiableLimit) {
      return { price: previousCounter, explanation: 'Your proposal is too low and outside our negotiation range. We maintain our original offer.', rule: 'R0', isFinal: true };
    }
    if (isProposalWithinMarginFromTop(proposal, offerPrice, margin, NEGOTIATION_PARAMETERS.THIRD_ROUND_CLOSE_THRESHOLD)) {
      return { price: proposal, explanation: 'In the final round, the proposal is close enough to our offer price to accept.', rule: 'R3.A', isFinal: true };
    }
    if (proposal === previousProposal && proposal >= minimumPrice && previousProposal - firstProposal >= NEGOTIATION_PARAMETERS.THIRD_ROUND_SIGNIFICANT_CONCESSION_THRESHOLD * margin) {
      return { price: proposal, explanation: 'Buyer made a significant concession earlier and is holding firm, suggesting this is their final offer. Accepting to secure the deal.', rule: 'R3.B', isFinal: true };
    }
    if (isProposalWithinMarginFromTop(proposal, offerPrice, margin, NEGOTIATION_PARAMETERS.THIRD_ROUND_GOOD_PROPOSAL_THRESHOLD)) {
      const counterPrice = average(proposal, previousCounter);
      if (counterPrice <= proposal) {
        return { price: proposal, explanation: 'Our counter-offer would be less than or equal to your proposal. Deal accepted.', rule: 'R3.C', isFinal: true };
      }
      return { price: counterPrice, explanation: 'Within negotiation margin, offering the middle ground for our final offer.', rule: 'R3.C', isFinal: true };
    }
    if (proposal - previousProposal >= NEGOTIATION_PARAMETERS.THIRD_ROUND_SIGNIFICANT_CONCESSION_THRESHOLD * margin) {
      const counterPrice = previousCounter - NEGOTIATION_PARAMETERS.THIRD_ROUND_GOOD_DISCOUNT_AMOUNT * margin;
      if (counterPrice <= proposal) {
        return { price: proposal, explanation: 'Our counter-offer would be less than or equal to your proposal. Deal accepted.', rule: 'R3.D', isFinal: true };
      }
      return { price: counterPrice, explanation: 'Buyer conceded significantly. Offering a good discount for our final offer.', rule: 'R3.D', isFinal: true };
    }
    const defaultCounterPrice = previousCounter - NEGOTIATION_PARAMETERS.THIRD_ROUND_SMALL_DISCOUNT_AMOUNT * margin;
    if (defaultCounterPrice <= proposal) {
      return { price: proposal, explanation: 'Our counter-offer would be less than or equal to your proposal. Deal accepted.', rule: 'R3.E', isFinal: true };
    }
    return { price: defaultCounterPrice, explanation: "Buyer didn't concede much. This is our final offer.", rule: 'R3.E', isFinal: true };
  },
};

function lastOrThrow(arr: readonly number[], label: string): number {
  const v = arr.at(-1);
  if (v === undefined) throw new Error(`Invariant violated: thirdRoundStrategy called without a previous ${label}`);
  return v;
}
function firstOrThrow(arr: readonly number[]): number {
  const v = arr[0];
  if (v === undefined) throw new Error('Invariant violated: thirdRoundStrategy called without any previous proposal');
  return v;
}
