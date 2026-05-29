export type RoundNumber = 1 | 2 | 3;
export type CounterSource = 'engine' | 'manual';
export type NegotiationStatus =
  | 'awaiting_supplier'
  | 'pending_buyer_review'
  | 'pending_confirmation'
  | 'bid_accepted'
  | 'offer_rejected'
  | 'offer_exhausted'
  | 'expired';

export interface CounterProposalInput {
  offerPrice: number;
  minimumPrice: number;
  previousProposals: number[];
  previousCounterProposals: number[];
  proposal: number;
  buyerHasNegotiatedBefore: boolean;
}

export interface CounterProposalOutput {
  price: number;
  explanation: string;
  rule: string;
  isFinal: boolean;
}

export interface NegotiationStrategy {
  readonly round: RoundNumber;
  generate(input: CounterProposalInput): CounterProposalOutput;
}
