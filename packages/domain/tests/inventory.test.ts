import { describe, expect, it } from "vitest";
import { applyInventoryTransaction } from "../src/inventory";

describe("applyInventoryTransaction", () => {
  it("adds inbound stock", () => {
    expect(
      applyInventoryTransaction(
        100,
        {
          productId: "product-1",
          storageLocationId: "location-1",
          direction: "in",
          quantityBaseUnit: 25
        },
        { allowNegativeStock: false }
      )
    ).toBe(125);
  });

  it("blocks negative stock unless explicitly allowed", () => {
    expect(() =>
      applyInventoryTransaction(
        10,
        {
          productId: "product-1",
          storageLocationId: "location-1",
          direction: "out",
          quantityBaseUnit: 25
        },
        { allowNegativeStock: false }
      )
    ).toThrow("Negative stock");
  });
});
