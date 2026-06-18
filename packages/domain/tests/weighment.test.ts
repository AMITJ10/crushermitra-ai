import { describe, expect, it } from "vitest";
import { calculateWeighment } from "../src/weighment";

describe("calculateWeighment", () => {
  it("calculates gross, tare and net from two readings", () => {
    expect(calculateWeighment({ firstWeightKg: 14250, secondWeightKg: 37600 })).toEqual({
      grossWeightKg: 37600,
      tareWeightKg: 14250,
      netWeightKg: 23350
    });
  });
});

