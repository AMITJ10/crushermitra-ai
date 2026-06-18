export interface WeighmentInput {
  firstWeightKg: number;
  secondWeightKg: number;
}

export interface WeighmentResult {
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
}

export function calculateWeighment(input: WeighmentInput): WeighmentResult {
  assertWeight(input.firstWeightKg, "firstWeightKg");
  assertWeight(input.secondWeightKg, "secondWeightKg");

  const grossWeightKg = Math.max(input.firstWeightKg, input.secondWeightKg);
  const tareWeightKg = Math.min(input.firstWeightKg, input.secondWeightKg);
  const netWeightKg = grossWeightKg - tareWeightKg;

  return {
    grossWeightKg,
    tareWeightKg,
    netWeightKg
  };
}

function assertWeight(value: number, fieldName: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative finite number.`);
  }
}

