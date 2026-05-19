import { MAX_ROUNDS } from './parameters.ts';
import { firstRoundStrategy } from './strategies/firstRound.ts';
import { secondRoundStrategy } from './strategies/secondRound.ts';
import { thirdRoundStrategy } from './strategies/thirdRound.ts';
import { roundPrice } from './strategies/base.ts';
import type { CounterProposalOutput, NegotiationStrategy, RoundNumber } from './types.ts';

const STRATEGIES: Record<RoundNumber, NegotiationStrategy> = {
  1: firstRoundStrategy,
  2: secondRoundStrategy,
  3: thirdRoundStrategy,
};

export interface GenerateCounterProposalInput {
  round: RoundNumber;
  offerPrice: number;
  minimumPrice: number;
  freightPerKg: number;
  proposal: number;
  previousProposals: readonly number[];
  previousCounterProposals: readonly number[];
  buyerHasNegotiatedBefore: boolean;
}

export function generateCounterProposal(input: GenerateCounterProposalInput): CounterProposalOutput {
  validateRound(input.round);
  validatePreviousRoundCounts(input);

  const { freightPerKg } = input;
  const stripped = {
    offerPrice: input.offerPrice - freightPerKg,
    minimumPrice: input.minimumPrice - freightPerKg,
    proposal: input.proposal - freightPerKg,
    previousProposals: input.previousProposals.map((p) => p - freightPerKg),
    previousCounterProposals: input.previousCounterProposals.map((p) => p - freightPerKg),
    buyerHasNegotiatedBefore: input.buyerHasNegotiatedBefore,
  };

  if (stripped.minimumPrice > stripped.offerPrice) {
    throw new Error('Invariant violated: minimumPrice > offerPrice (after stripping freight). Check offer setup.');
  }

  const strategy = STRATEGIES[input.round];
  const result = strategy.generate(stripped);

  return { ...result, price: roundPrice(result.price + freightPerKg) };
}

function validateRound(round: number): asserts round is RoundNumber {
  if (round < 1 || round > MAX_ROUNDS || !Number.isInteger(round)) {
    throw new Error(`Invalid round ${round}. Must be integer in [1, ${MAX_ROUNDS}].`);
  }
}

function validatePreviousRoundCounts(input: GenerateCounterProposalInput): void {
  const expected = input.round - 1;
  if (input.previousProposals.length !== expected) {
    throw new Error(`Round ${input.round} expects ${expected} previous proposal(s), got ${input.previousProposals.length}.`);
  }
  if (input.previousCounterProposals.length !== expected) {
    throw new Error(`Round ${input.round} expects ${expected} previous counter-proposal(s), got ${input.previousCounterProposals.length}.`);
  }
}
