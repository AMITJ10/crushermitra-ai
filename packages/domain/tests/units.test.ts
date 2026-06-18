import { describe, expect, it } from "vitest";
import { convertProductQuantity } from "../src/units";

describe("convertProductQuantity", () => {
  it("uses the product-specific conversion factor", () => {
    expect(
      convertProductQuantity(10, {
        productId: "m-sand",
        organisationId: "shivneri",
        fromUnit: "brass",
        toUnit: "tonne",
        factor: 4.5
      })
    ).toBe(45);
  });

  it("rejects invalid conversion factors", () => {
    expect(() =>
      convertProductQuantity(10, {
        productId: "m-sand",
        organisationId: "shivneri",
        fromUnit: "brass",
        toUnit: "tonne",
        factor: 0
      })
    ).toThrow("positive");
  });
});
