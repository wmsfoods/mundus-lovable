import { NEGOTIATION_PARAMETERS } from '../parameters.ts';
import type { CounterProposalInput, CounterProposalOutput, NegotiationStrategy } from '../types.ts';
import { average, calculateNonNegotiableLimit, isProposalCloseToMinimum, isProposalWithinMarginFromTop } from './base.ts';

export const firstRoundStrategy: NegotiationStrategy = {
  round: 1,
  generate(input: CounterProposalInput): CounterProposalOutput {
    const { offerPrice, minimumPrice, proposal, buyerHasNegotiatedBefore } = input;
    const margin = offerPrice - minimumPrice;
    const nonNegotiableLimit = calculateNonNegotiableLimit(minimumPrice, margin);

    if (proposal < nonNegotiableLimit) {
      return { price: offerPrice, explanation: 'Your proposal is too low and outside our negotiation range. We maintain our original offer.', rule: 'R0', isFinal: false };
    }
    if (isProposalWithinMarginFromTop(proposal, offerPrice, margin, NEGOTIATION_PARAMETERS.FIRST_ROUND_CLOSE_THRESHOLD)) {
      return { price: proposal, explanation: 'Already close to the offer price and only using a small portion of the negotiation margin, better to secure the deal.', rule: 'R1.A', isFinal: true };
    }
    if (isProposalWithinMarginFromTop(proposal, offerPrice, margin, NEGOTIATION_PARAMETERS.FIRST_ROUND_COUNTER_THRESHOLD)) {
      return { price: average(proposal, offerPrice), explanation: 'Within negotiation margin and buyer seems interested, offering the middle ground to show goodwill.', rule: 'R1.B', isFinal: false };
    }
    if (isProposalCloseToMinimum(proposal, minimumPrice, margin, NEGOTIATION_PARAMETERS.FIRST_ROUND_GOOD_OFFER_THRESHOLD)) {
      if (!buyerHasNegotiatedBefore) {
        return { price: offerPrice - NEGOTIATION_PARAMETERS.FIRST_TIME_NEGOTIATOR_DISCOUNT * margin, explanation: "Buyer's first proposal is close to our minimum acceptable price, showing genuine interest. Offering a significant discount to capture this qualified proposal.", rule: 'R1.C.1', isFinal: false };
      }
      return { price: offerPrice - NEGOTIATION_PARAMETERS.RETURNING_NEGOTIATOR_DISCOUNT * margin, explanation: 'Buyer has negotiated before, showing continued interest. Offering a modest discount to show goodwill.', rule: 'R1.C.2', isFinal: false };
    }
    return { price: offerPrice - NEGOTIATION_PARAMETERS.DEFAULT_SMALL_DISCOUNT * margin, explanation: 'Proposal is within negotiation range but far from expected price. Offering a small discount to signal negotiation space.', rule: 'R1.D', isFinal: false };
  },
};
