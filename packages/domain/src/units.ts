export type UnitCode =
  | "tonne"
  | "kilogram"
  | "cubic_metre"
  | "cubic_foot"
  | "brass"
  | "litre"
  | "electricity_unit"
  | "kilometre";

export interface ProductUnitConversion {
  productId: string;
  organisationId: string;
  fromUnit: UnitCode;
  toUnit: UnitCode;
  factor: number;
}

export function convertProductQuantity(
  quantity: number,
  conversion: ProductUnitConversion
): number {
  if (!Number.isFinite(quantity)) {
    throw new Error("Quantity must be a finite number.");
  }

  if (!Number.isFinite(conversion.factor) || conversion.factor <= 0) {
    throw new Error("Conversion factor must be a positive number.");
  }

  return quantity * conversion.factor;
}

