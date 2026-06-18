import { describe, expect, it } from "vitest";
import {
  gstinSchema,
  indianMobileSchema,
  inventoryCorrectionSchema,
  loginSchema,
  masterDataSchemas,
  normaliseVehicleRegistration,
  panSchema,
  pincodeSchema,
  productionRunSchema,
  purchaseReceiptSchema,
  stockMovementSchema,
  workflowSchemas
} from "../src";

describe("Indian validation schemas", () => {
  it("accepts valid Indian business identifiers", () => {
    expect(panSchema.safeParse("ABCDE1234F").success).toBe(true);
    expect(gstinSchema.safeParse("27ABCDE1234F1Z5").success).toBe(true);
    expect(indianMobileSchema.safeParse("9876543210").success).toBe(true);
    expect(pincodeSchema.safeParse("411001").success).toBe(true);
  });

  it("rejects invalid login input", () => {
    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "short"
      }).success
    ).toBe(false);
  });
});

describe("workflow validation schemas", () => {
  it("accepts a valid order and dispatch payload", () => {
    expect(
      workflowSchemas.orders.safeParse({
        customerId: "77777777-7777-4777-8777-777777777771",
        productId: "44444444-4444-4444-8444-444444444443",
        quantity: 25,
        unit: "tonne",
        rate: 760,
        orderDate: "2026-06-10",
        status: "approved"
      }).success
    ).toBe(true);

    expect(
      workflowSchemas.dispatches.safeParse({
        customerId: "77777777-7777-4777-8777-777777777771",
        productId: "44444444-4444-4444-8444-444444444443",
        sourceStorageLocationId: "55555555-5555-4555-8555-555555555552",
        quantity: 12,
        unit: "tonne",
        dispatchDate: "2026-06-10",
        firstWeight: 10000,
        secondWeight: 22000,
        status: "ready"
      }).success
    ).toBe(true);
  });

  it("rejects invalid workflow quantities", () => {
    expect(
      workflowSchemas.orders.safeParse({
        customerId: "77777777-7777-4777-8777-777777777771",
        productId: "44444444-4444-4444-8444-444444444443",
        quantity: 0,
        unit: "tonne",
        rate: 760,
        orderDate: "2026-06-10"
      }).success
    ).toBe(false);
  });
});

describe("phase 2 master data validation", () => {
  it("accepts valid master data payloads", () => {
    expect(
      masterDataSchemas.customers.safeParse({
        code: "CUST-001",
        customerType: "builder",
        legalName: "Demo Builder Pvt Ltd",
        tradeName: "Demo Builder",
        contactPerson: "Anil Demo",
        phone: "9876543210",
        billingAddress: "Demo billing address, Pune",
        state: "Maharashtra",
        district: "Pune",
        pincode: "411001",
        creditLimit: 100000,
        creditDays: 30
      }).success
    ).toBe(true);

    expect(
      masterDataSchemas.productPrices.safeParse({
        productId: "44444444-4444-4444-8444-444444444444",
        priceType: "sale",
        unit: "tonne",
        rate: 850,
        effectiveFrom: "2026-06-10"
      }).success
    ).toBe(true);
  });

  it("rejects cross-domain and unsafe master data input", () => {
    expect(
      masterDataSchemas.vehicles.safeParse({
        registrationNumber: "MH12AB1234",
        vehicleType: "rocket",
        ownerType: "owned",
        ownerName: "Demo Transport"
      }).success
    ).toBe(false);

    expect(
      masterDataSchemas.customerSites.safeParse({
        customerId: "not-a-uuid",
        siteCode: "SITE-1",
        siteName: "Demo Site",
        contactPerson: "Demo User",
        phone: "9876543210",
        address: "Demo site address",
        state: "Maharashtra",
        district: "Pune",
        pincode: "411001"
      }).success
    ).toBe(false);
  });
});

describe("phase 3 master data integrity validation", () => {
  it("normalises business codes and vehicle registrations", () => {
    const customer = masterDataSchemas.customers.parse({
      code: " cust-001 ",
      customerType: "builder",
      legalName: "Demo Builder Pvt Ltd",
      tradeName: "Demo Builder",
      contactPerson: "Anil Demo",
      phone: "9876543210",
      billingAddress: "Demo billing address, Pune",
      state: "Maharashtra",
      district: "Pune",
      pincode: "411001",
      creditLimit: 100000,
      creditDays: 30
    });

    expect(customer.code).toBe("CUST-001");
    expect(normaliseVehicleRegistration("mh-12 ab 1234")).toBe("MH12AB1234");
    expect(
      masterDataSchemas.vehicles.parse({
        registrationNumber: "mh-12 ab 1234",
        vehicleType: "tipper",
        ownerType: "owned",
        ownerName: "Demo Transport"
      }).registrationNumber
    ).toBe("MH12AB1234");
  });

  it("rejects invalid product thresholds", () => {
    expect(
      masterDataSchemas.products.safeParse({
        code: "AGG-10",
        name: "Aggregate 10mm",
        category: "crusher_output",
        baseUnit: "tonne",
        purchaseUnit: "tonne",
        salesUnit: "tonne",
        minStock: 100,
        maxStock: 50
      }).success
    ).toBe(false);
  });

  it("rejects identical unit conversions", () => {
    expect(
      masterDataSchemas.productUnits.safeParse({
        productId: "44444444-4444-4444-8444-444444444444",
        fromUnit: "tonne",
        toUnit: "tonne",
        factor: 1
      }).success
    ).toBe(false);
  });

  it("validates cross-midnight shifts", () => {
    expect(
      masterDataSchemas.shifts.safeParse({
        plantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        code: "shift-c",
        name: "Shift C",
        startTime: "22:00",
        endTime: "06:00",
        crossesMidnight: true,
        breakDurationMinutes: 30
      }).success
    ).toBe(true);

    expect(
      masterDataSchemas.shifts.safeParse({
        plantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        code: "shift-bad",
        name: "Bad Shift",
        startTime: "22:00",
        endTime: "06:00",
        crossesMidnight: false
      }).success
    ).toBe(false);
  });
});

describe("phase 4 inventory validation", () => {
  it("accepts valid stock documents", () => {
    expect(
      purchaseReceiptSchema.safeParse({
        storageLocationId: "55555555-5555-4555-8555-555555555551",
        productId: "44444444-4444-4444-8444-444444444441",
        receiptDate: "2026-06-11",
        quantity: 25,
        unit: "tonne"
      }).success
    ).toBe(true);

    expect(
      productionRunSchema.safeParse({
        runType: "crusher",
        productionDate: "2026-06-11",
        inputs: [{
          storageLocationId: "55555555-5555-4555-8555-555555555551",
          productId: "44444444-4444-4444-8444-444444444441",
          quantity: 10,
          unit: "tonne"
        }],
        outputs: [{
          storageLocationId: "55555555-5555-4555-8555-555555555552",
          productId: "44444444-4444-4444-8444-444444444444",
          quantity: 6,
          unit: "tonne"
        }]
      }).success
    ).toBe(true);
  });

  it("rejects unsafe inventory changes", () => {
    expect(
      stockMovementSchema.safeParse({
        fromStorageLocationId: "55555555-5555-4555-8555-555555555551",
        toStorageLocationId: "55555555-5555-4555-8555-555555555551",
        productId: "44444444-4444-4444-8444-444444444441",
        movementDate: "2026-06-11",
        quantity: 1,
        unit: "tonne",
        reason: "Same bin"
      }).success
    ).toBe(false);

    expect(
      inventoryCorrectionSchema.safeParse({
        storageLocationId: "55555555-5555-4555-8555-555555555551",
        productId: "44444444-4444-4444-8444-444444444441",
        correctedQuantityBaseUnit: -1,
        reason: "Physical stock verification"
      }).success
    ).toBe(false);
  });
});
