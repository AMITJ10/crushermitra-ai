export type InventoryDirection = "in" | "out";

export interface InventoryTransactionDraft {
  productId: string;
  storageLocationId: string;
  quantityBaseUnit: number;
  direction: InventoryDirection;
}

export function applyInventoryTransaction(
  currentQuantity: number,
  transaction: InventoryTransactionDraft,
  options: { allowNegativeStock: boolean }
): number {
  if (!Number.isFinite(currentQuantity)) {
    throw new Error("Current quantity must be finite.");
  }

  if (!Number.isFinite(transaction.quantityBaseUnit) || transaction.quantityBaseUnit <= 0) {
    throw new Error("Transaction quantity must be positive.");
  }

  const nextQuantity =
    transaction.direction === "in"
      ? currentQuantity + transaction.quantityBaseUnit
      : currentQuantity - transaction.quantityBaseUnit;

  if (!options.allowNegativeStock && nextQuantity < 0) {
    throw new Error("Negative stock is not allowed for this organisation.");
  }

  return nextQuantity;
}

