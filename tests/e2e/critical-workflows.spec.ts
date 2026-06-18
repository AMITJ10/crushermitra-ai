import { expect, test } from "@playwright/test";

const ownerEmail = "owner@shivneri.example";
const ownerPassword = "ChangeMe!123";
const inventoryAdjusterEmail = "inventory-adjuster@shivneri.example";
const inventoryViewerEmail = "inventory-viewer@shivneri.example";

async function login(page: import("@playwright/test").Page, email = ownerEmail, password = ownerPassword) {
  await page.goto("/en/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("critical authenticated workflows", () => {
  test("login creates an authenticated dashboard session", async ({ page }) => {
    await login(page);
    const response = await page.request.get("/api/v1/session-context");
    expect(response.status()).toBe(200);
    const session = await response.json();
    expect(session.organisationId).toBeTruthy();
    expect(session.activePlantId).toBeTruthy();
  });

  test("customer creation persists and duplicate customer code is rejected", async ({ page }) => {
    await login(page);
    const code = `QA-PW-${Date.now()}`;
    const payload = {
      code,
      customerType: "contractor",
      legalName: "QA Playwright Customer Pvt Ltd",
      tradeName: "QA Playwright",
      contactPerson: "QA Tester",
      phone: "9876543210",
      email: `qa-${Date.now()}@example.test`,
      billingAddress: "QA test address Pune",
      state: "Maharashtra",
      district: "Pune",
      pincode: "411001",
      creditLimit: 10000,
      creditDays: 15,
      active: true
    };

    const create = await page.request.post("/api/v1/master-data/customers", { data: payload });
    expect(create.status()).toBe(201);
    const list = await page.request.get(`/api/v1/master-data/customers?search=${code}`);
    expect(await list.text()).toContain(code);

    const duplicate = await page.request.post("/api/v1/master-data/customers", { data: payload });
    expect(duplicate.status(), "duplicate customer code must be rejected").toBeGreaterThanOrEqual(400);
  });

  test("case-insensitive customer code duplicates are rejected", async ({ page }) => {
    await login(page);
    const suffix = Date.now();
    const payload = {
      code: `QA-CI-${suffix}`,
      customerType: "contractor",
      legalName: "QA Case Customer Pvt Ltd",
      tradeName: "QA Case",
      contactPerson: "QA Tester",
      phone: "9876543210",
      billingAddress: "QA test address Pune",
      state: "Maharashtra",
      district: "Pune",
      pincode: "411001",
      creditLimit: 10000,
      creditDays: 15,
      active: true
    };

    const create = await page.request.post("/api/v1/master-data/customers", { data: payload });
    expect(create.status()).toBe(201);

    const duplicate = await page.request.post("/api/v1/master-data/customers", {
      data: { ...payload, code: payload.code.toLowerCase(), legalName: "QA Duplicate Customer Pvt Ltd" }
    });
    expect(duplicate.status()).toBe(409);
    const body = await duplicate.json();
    expect(body.error.code).toBe("CUSTOMER_CODE_EXISTS");
  });

  test("vehicle registration normalisation rejects equivalent duplicates", async ({ page }) => {
    await login(page);
    const suffix = String(Date.now()).slice(-4);
    const registration = `MH12QA${suffix}`;
    const payload = {
      registrationNumber: registration,
      vehicleType: "tipper",
      ownerType: "owned",
      ownerName: "QA Transport",
      capacityTonne: 18,
      active: true
    };

    const create = await page.request.post("/api/v1/master-data/vehicles", { data: payload });
    expect(create.status()).toBe(201);

    const duplicate = await page.request.post("/api/v1/master-data/vehicles", {
      data: { ...payload, registrationNumber: `mh-12-qa-${suffix}` }
    });
    expect(duplicate.status()).toBe(409);
  });

  test("cross-midnight shift can be created", async ({ page }) => {
    await login(page);
    const session = await (await page.request.get("/api/v1/session-context")).json();
    const response = await page.request.post("/api/v1/master-data/shifts", {
      data: {
        plantId: session.activePlantId,
        code: `QA-NIGHT-${Date.now()}`,
        name: "QA Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        crossesMidnight: true,
        breakDurationMinutes: 30,
        activeDays: ["mon", "tue", "wed", "thu", "fri", "sat"],
        active: true
      }
    });

    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.crossesMidnight).toBe(true);
  });

  test("sales order and dispatch calculations are persisted through APIs", async ({ page }) => {
    await login(page);
    const session = await (await page.request.get("/api/v1/session-context")).json();
    const suffix = `DSP-${Date.now()}`;
    const customers = await (await page.request.get("/api/v1/master-data/customers?page=1&pageSize=1")).json();
    expect(customers.rows.length).toBeGreaterThan(0);
    const product = await createInventoryProduct(page, `QA-DSP-${suffix}`, "QA Dispatch Aggregate", "crusher_output");
    const sourceLocation = await createStorageLocation(page, session.activePlantId, `QA-DSP-YARD-${suffix}`, "QA Dispatch Yard");

    const receipt = await page.request.post("/api/v1/inventory/purchase-receipts", {
      data: {
        productId: product.id,
        storageLocationId: sourceLocation.id,
        receiptDate: "2026-06-11",
        quantity: 25,
        unit: "tonne",
        unitCost: 425,
        notes: "Playwright dispatch source stock"
      }
    });
    expect(receipt.status()).toBe(201);
    await expect.poll(() => balanceQuantity(page, product.id, sourceLocation.id)).toBeCloseTo(25, 3);

    const order = await page.request.post("/api/v1/workflows/orders", {
      data: {
        customerId: customers.rows[0].id,
        productId: product.id,
        quantity: 10,
        unit: "tonne",
        rate: 850,
        paidAmount: 1000,
        orderDate: "2026-06-11",
        status: "approved"
      }
    });
    expect(order.status()).toBe(201);
    const orderBody = await order.json();
    expect(Number(orderBody.totalAmount)).toBe(8500);
    expect(Number(orderBody.balanceAmount)).toBe(7500);

    const dispatch = await page.request.post("/api/v1/workflows/dispatches", {
      data: {
        customerId: customers.rows[0].id,
        productId: product.id,
        sourceStorageLocationId: sourceLocation.id,
        quantity: 10,
        unit: "tonne",
        dispatchDate: "2026-06-11",
        firstWeight: 12_000,
        secondWeight: 32_000,
        rate: 850,
        paidAmount: 2000,
        status: "dispatched"
      }
    });
    const dispatchText = await dispatch.text();
    expect(dispatch.status(), dispatchText).toBe(201);
    const dispatchBody = JSON.parse(dispatchText);
    expect(Number(dispatchBody.netWeight)).toBe(20_000);
    expect(Number(dispatchBody.dispatchAmount)).toBe(8500);
    expect(dispatchBody.inventoryTransactionId).toBeTruthy();
    await expect.poll(() => balanceQuantity(page, product.id, sourceLocation.id)).toBeCloseTo(15, 3);

    const cancellation = await page.request.patch(`/api/v1/workflows/dispatches/${dispatchBody.id}`, {
      data: {
        status: "cancelled",
        notes: "Playwright dispatch cancellation with stock reversal"
      }
    });
    expect(cancellation.status()).toBe(200);
    const cancellationBody = await cancellation.json();
    expect(cancellationBody.cancellationInventoryTransactionId).toBeTruthy();
    await expect.poll(() => balanceQuantity(page, product.id, sourceLocation.id)).toBeCloseTo(25, 3);
  });

  test("completed production cannot be edited without correction workflow", async ({ page }) => {
    await login(page);
    const operations = await (await page.request.get("/api/v1/workflows/operations?page=1&pageSize=1")).json();
    expect(operations.rows.length).toBeGreaterThan(0);
    const operation = operations.rows[0];
    const update = await page.request.patch(`/api/v1/workflows/operations/${operation.id}`, {
      data: { quantity: Number(operation.quantity) + 1 }
    });
    expect(update.status(), "approved/completed production must be immutable").toBeGreaterThanOrEqual(400);
  });

  test("inventory ledger posts receipts, movements, production, dispatch reduction and correction approval", async ({ page }, testInfo) => {
    await login(page);
    const session = await (await page.request.get("/api/v1/session-context")).json();
    const suffix = `${testInfo.project.name.replace(/[^a-z0-9]/gi, "").toUpperCase()}-${Date.now()}`;
    const rawProduct = await createInventoryProduct(page, `QA-RAW-${suffix}`, "QA Raw Stone", "raw_stone");
    const outputProduct = await createInventoryProduct(page, `QA-OUT-${suffix}`, "QA Output Aggregate", "crusher_output");
    const rawLocation = await createStorageLocation(page, session.activePlantId, `QA-SRC-${suffix}`, "QA Source Stockpile");
    const finishedLocation = await createStorageLocation(page, session.activePlantId, `QA-DST-${suffix}`, "QA Finished Yard");

    const rawBefore = await balanceQuantity(page, rawProduct.id, rawLocation.id);
    const receipt = await page.request.post("/api/v1/inventory/purchase-receipts", {
      data: {
        productId: rawProduct.id,
        storageLocationId: rawLocation.id,
        receiptDate: "2026-06-11",
        quantity: 5,
        unit: "tonne",
        unitCost: 350,
        notes: "Playwright stock receipt"
      }
    });
    expect(receipt.status()).toBe(201);
    await expect.poll(() => balanceQuantity(page, rawProduct.id, rawLocation.id)).toBeCloseTo(rawBefore + 5, 3);

    const rawValuation = await page.request.get(`/api/v1/inventory/valuation?productId=${rawProduct.id}&storageLocationId=${rawLocation.id}&page=1&pageSize=10`);
    expect(rawValuation.status()).toBe(200);
    const rawValuationBody = await rawValuation.json();
    expect(Number(rawValuationBody.rows[0]?.weightedAverageRate ?? 0)).toBeGreaterThan(0);
    expect(Number(rawValuationBody.rows[0]?.fifoValue ?? 0)).toBeGreaterThan(0);

    const pendingMovement = await page.request.post("/api/v1/inventory/stock-movements", {
      data: {
        productId: rawProduct.id,
        fromStorageLocationId: rawLocation.id,
        toStorageLocationId: finishedLocation.id,
        movementDate: "2026-06-11",
        quantity: 0.25,
        unit: "tonne",
        reason: "Playwright transfer requiring approval",
        requiresApproval: true
      }
    });
    expect(pendingMovement.status()).toBe(201);
    const pendingMovementBody = await pendingMovement.json();
    expect(pendingMovementBody.status).toBe("pending_approval");
    await expect.poll(() => balanceQuantity(page, rawProduct.id, rawLocation.id)).toBeCloseTo(rawBefore + 5, 3);
    const movementApproval = await page.request.post(`/api/v1/inventory/stock-movements/${pendingMovementBody.id}/approve`, {
      data: { reason: "Approved by Playwright adjuster" }
    });
    const movementApprovalText = await movementApproval.text();
    expect(movementApproval.status(), movementApprovalText).toBe(200);
    await expect.poll(() => balanceQuantity(page, rawProduct.id, rawLocation.id)).toBeCloseTo(rawBefore + 4.75, 3);

    const movement = await page.request.post("/api/v1/inventory/stock-movements", {
      data: {
        productId: rawProduct.id,
        fromStorageLocationId: rawLocation.id,
        toStorageLocationId: finishedLocation.id,
        movementDate: "2026-06-11",
        quantity: 2,
        unit: "tonne",
        reason: "Playwright transfer to finished yard"
      }
    });
    expect(movement.status()).toBe(201);
    await expect.poll(() => balanceQuantity(page, rawProduct.id, rawLocation.id)).toBeCloseTo(rawBefore + 2.75, 3);
    await expect.poll(() => balanceQuantity(page, rawProduct.id, finishedLocation.id)).toBeGreaterThanOrEqual(2.25);

    const outputBefore = await balanceQuantity(page, outputProduct.id, finishedLocation.id);
    const production = await page.request.post("/api/v1/inventory/production-runs", {
      data: {
        runType: "crusher",
        productionDate: "2026-06-11",
        inputs: [{
          productId: rawProduct.id,
          storageLocationId: rawLocation.id,
          quantity: 1,
          unit: "tonne"
        }],
        outputs: [{
          productId: outputProduct.id,
          storageLocationId: finishedLocation.id,
          quantity: 0.75,
          unit: "tonne"
        }],
        notes: "Playwright crusher run"
      }
    });
    expect(production.status()).toBe(201);
    await expect.poll(() => balanceQuantity(page, outputProduct.id, finishedLocation.id)).toBeCloseTo(outputBefore + 0.75, 3);

    const overIssue = await page.request.post("/api/v1/inventory/dispatch-reductions", {
      data: {
        productId: outputProduct.id,
        storageLocationId: finishedLocation.id,
        dispatchDate: "2026-06-11",
        quantity: 999999,
        unit: "tonne",
        reason: "Playwright negative-stock guard"
      }
    });
    expect(overIssue.status()).toBeGreaterThanOrEqual(400);
    expect(await overIssue.text()).toContain("Negative stock is not allowed");

    const dispatchReduction = await page.request.post("/api/v1/inventory/dispatch-reductions", {
      data: {
        productId: outputProduct.id,
        storageLocationId: finishedLocation.id,
        dispatchDate: "2026-06-11",
        quantity: 0.5,
        unit: "tonne",
        reason: "Playwright dispatch reduction"
      }
    });
    expect(dispatchReduction.status()).toBe(201);

    const correctedQuantity = await balanceQuantity(page, rawProduct.id, rawLocation.id);
    const correction = await page.request.post("/api/v1/inventory/corrections", {
      data: {
        productId: rawProduct.id,
        storageLocationId: rawLocation.id,
        correctedQuantityBaseUnit: correctedQuantity + 0.25,
        reason: "Playwright physical stock correction"
      }
    });
    expect(correction.status()).toBe(201);
    const correctionBody = await correction.json();
    const approval = await page.request.post(`/api/v1/inventory/corrections/${correctionBody.id}/approve`);
    expect(approval.status()).toBe(200);
    await expect.poll(() => balanceQuantity(page, rawProduct.id, rawLocation.id)).toBeCloseTo(correctedQuantity + 0.25, 3);

    const rejectedCorrection = await page.request.post("/api/v1/inventory/corrections", {
      data: {
        productId: rawProduct.id,
        storageLocationId: rawLocation.id,
        correctedQuantityBaseUnit: correctedQuantity + 0.5,
        reason: "Playwright rejected stock correction"
      }
    });
    expect(rejectedCorrection.status()).toBe(201);
    const rejectedBody = await rejectedCorrection.json();
    const rejection = await page.request.post(`/api/v1/inventory/corrections/${rejectedBody.id}/reject`, {
      data: { reason: "Rejected after stock recount" }
    });
    expect(rejection.status()).toBe(200);

    const cancelledCorrection = await page.request.post("/api/v1/inventory/corrections", {
      data: {
        productId: rawProduct.id,
        storageLocationId: rawLocation.id,
        correctedQuantityBaseUnit: correctedQuantity + 0.75,
        reason: "Playwright cancelled stock correction"
      }
    });
    expect(cancelledCorrection.status()).toBe(201);
    const cancelledBody = await cancelledCorrection.json();
    const cancellation = await page.request.post(`/api/v1/inventory/corrections/${cancelledBody.id}/cancel`, {
      data: { reason: "Cancelled because physical recount changed" }
    });
    expect(cancellation.status()).toBe(200);

    const valuation = await page.request.get(`/api/v1/inventory/valuation?productId=${outputProduct.id}&storageLocationId=${finishedLocation.id}&page=1&pageSize=10`);
    expect(valuation.status()).toBe(200);
    const valuationBody = await valuation.json();
    expect(Number(valuationBody.total)).toBeGreaterThanOrEqual(1);
    expect("totalValue" in valuationBody).toBe(true);

    const valuationCsv = await page.request.get(`/api/v1/inventory/valuation?productId=${outputProduct.id}&storageLocationId=${finishedLocation.id}&export=csv`);
    expect(valuationCsv.status()).toBe(200);
    expect(await valuationCsv.text()).toContain(String(outputProduct.code));

    const valuationPdf = await page.request.get(`/api/v1/inventory/valuation?productId=${outputProduct.id}&storageLocationId=${finishedLocation.id}&format=pdf`);
    expect(valuationPdf.status()).toBe(200);
    expect(valuationPdf.headers()["content-type"]).toContain("application/pdf");

    const ageing = await page.request.get(`/api/v1/inventory/ageing?productId=${outputProduct.id}&storageLocationId=${finishedLocation.id}&page=1&pageSize=10`);
    expect(ageing.status()).toBe(200);
    const ageingBody = await ageing.json();
    expect(Number(ageingBody.total)).toBeGreaterThanOrEqual(1);

    const ageingPdf = await page.request.get(`/api/v1/inventory/ageing?productId=${outputProduct.id}&storageLocationId=${finishedLocation.id}&format=pdf`);
    expect(ageingPdf.status()).toBe(200);
    expect(ageingPdf.headers()["content-type"]).toContain("application/pdf");

    const closeDay = String((Date.now() % 20) + (testInfo.project.name.includes("mobile") ? 1 : 8)).padStart(2, "0");
    const closeSuffixDate = `2027-12-${closeDay}`;
    const closePeriod = await page.request.post("/api/v1/inventory/close-periods", {
      data: {
        periodStart: closeSuffixDate,
        periodEnd: closeSuffixDate,
        reason: "Playwright monthly inventory close"
      }
    });
    expect(closePeriod.status()).toBe(201);
    const blockedReceipt = await page.request.post("/api/v1/inventory/purchase-receipts", {
      data: {
        productId: rawProduct.id,
        storageLocationId: rawLocation.id,
        receiptDate: closeSuffixDate,
        quantity: 1,
        unit: "tonne",
        unitCost: 100,
        notes: "Blocked by close period"
      }
    });
    expect(blockedReceipt.status()).toBeGreaterThanOrEqual(400);
    expect(await blockedReceipt.text()).toContain("Inventory period is closed");
  });

  test("inventory screen exposes role-aware stock controls for owners", async ({ page }) => {
    await login(page, inventoryAdjusterEmail);
    await page.goto("/en/inventory");
    await expect(page.getByRole("heading", { name: "Inventory valuation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Post inventory action" })).toBeVisible();
  });

  test("read-only inventory viewer can inspect stock but cannot post adjustments", async ({ page }) => {
    await login(page, inventoryViewerEmail);
    await page.goto("/en/inventory");
    await expect(page.getByRole("heading", { name: "Inventory valuation" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Inventory actions" })).toBeVisible();
    await expect(page.getByText("Stock posting requires inventory adjustment permission.")).toBeVisible();

    const response = await page.request.post("/api/v1/inventory/corrections", {
      data: {
        productId: "44444444-4444-4444-8444-444444444444",
        storageLocationId: "55555555-5555-4555-8555-555555555552",
        correctedQuantityBaseUnit: 1,
        reason: "Viewer cannot post inventory correction"
      }
    });
    expect(response.status()).toBe(403);
  });

  test("approved orders allocate, reallocate, expire and release storage-level reservations", async ({ page }, testInfo) => {
    await login(page);
    const session = await (await page.request.get("/api/v1/session-context")).json();
    const suffix = `RSV-${testInfo.project.name.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3)}-${Date.now().toString(36).toUpperCase()}`;
    const customers = await (await page.request.get("/api/v1/master-data/customers?page=1&pageSize=1")).json();
    const product = await createInventoryProduct(page, `QA-${suffix}`, "QA Reservation Aggregate", "crusher_output");
    const locationA = await createStorageLocation(page, session.activePlantId, `QA-A-${suffix}`, "QA Reservation Yard A");
    const locationB = await createStorageLocation(page, session.activePlantId, `QA-B-${suffix}`, "QA Reservation Yard B");
    const locationC = await createStorageLocation(page, session.activePlantId, `QA-C-${suffix}`, "QA Reservation Yard C");
    const receiptA = await page.request.post("/api/v1/inventory/purchase-receipts", {
      data: {
        productId: product.id,
        storageLocationId: locationA.id,
        receiptDate: "2026-06-11",
        quantity: 3,
        unit: "tonne",
        unitCost: 500,
        notes: "Reservation test stock"
      }
    });
    expect(receiptA.status()).toBe(201);
    const receiptB = await page.request.post("/api/v1/inventory/purchase-receipts", {
      data: {
        productId: product.id,
        storageLocationId: locationB.id,
        receiptDate: "2026-06-11",
        quantity: 4,
        unit: "tonne",
        unitCost: 500,
        notes: "Reservation test stock"
      }
    });
    expect(receiptB.status()).toBe(201);

    const order = await page.request.post("/api/v1/workflows/orders", {
      data: {
        customerId: customers.rows[0].id,
        productId: product.id,
        quantity: 5,
        unit: "tonne",
        rate: 900,
        orderDate: "2026-06-11",
        status: "approved"
      }
    });
    const orderText = await order.text();
    expect(order.status(), orderText).toBe(201);
    const orderBody = JSON.parse(orderText);
    await expect.poll(async () =>
      await balanceField(page, product.id, locationA.id, "reservedQuantityBaseUnit") +
      await balanceField(page, product.id, locationB.id, "reservedQuantityBaseUnit")
    ).toBeCloseTo(5, 3);

    const receiptC = await page.request.post("/api/v1/inventory/purchase-receipts", {
      data: {
        productId: product.id,
        storageLocationId: locationC.id,
        receiptDate: "2026-06-11",
        quantity: 6,
        unit: "tonne",
        unitCost: 500,
        notes: "Reservation reallocation stock"
      }
    });
    expect(receiptC.status()).toBe(201);

    const reallocate = await page.request.post("/api/v1/inventory/reservations/reallocate", {
      data: {
        orderId: orderBody.id,
        reservedUntil: "2026-06-10T00:00:00.000Z"
      }
    });
    expect(reallocate.status()).toBe(200);
    await expect.poll(() => balanceField(page, product.id, locationC.id, "reservedQuantityBaseUnit")).toBeCloseTo(5, 3);

    const expire = await page.request.post("/api/v1/inventory/reservations/expire", {
      data: { now: "2026-06-11T00:00:00.000Z" }
    });
    expect(expire.status()).toBe(200);
    await expect.poll(() => balanceField(page, product.id, locationC.id, "reservedQuantityBaseUnit")).toBeCloseTo(0, 3);

    const reallocateActive = await page.request.post("/api/v1/inventory/reservations/reallocate", {
      data: { orderId: orderBody.id }
    });
    expect(reallocateActive.status()).toBe(200);

    const release = await page.request.patch(`/api/v1/workflows/orders/${orderBody.id}`, {
      data: { status: "cancelled" }
    });
    expect(release.status()).toBe(200);
    await expect.poll(async () =>
      await balanceField(page, product.id, locationA.id, "reservedQuantityBaseUnit") +
      await balanceField(page, product.id, locationB.id, "reservedQuantityBaseUnit") +
      await balanceField(page, product.id, locationC.id, "reservedQuantityBaseUnit")
    ).toBeCloseTo(0, 3);
  });

  test("unauthenticated API access is rejected", async ({ request }) => {
    const response = await request.get("/api/v1/master-data/customers?page=1&pageSize=1");
    expect(response.status()).toBe(401);

    const create = await request.post("/api/v1/master-data/customers", {
      data: {
        code: `QA-UNAUTH-${Date.now()}`,
        customerType: "contractor",
        legalName: "Unauthenticated Customer Pvt Ltd",
        tradeName: "Unauthenticated",
        contactPerson: "No Session",
        phone: "9876543210",
        billingAddress: "Should not persist",
        state: "Maharashtra",
        district: "Pune",
        pincode: "411001",
        creditLimit: 100,
        creditDays: 1,
        active: true
      }
    });
    expect(create.status()).toBe(401);

    const balances = await request.get("/api/v1/inventory/balances?page=1&pageSize=1");
    expect(balances.status()).toBe(401);

    const valuation = await request.get("/api/v1/inventory/valuation?page=1&pageSize=1");
    expect(valuation.status()).toBe(401);

    const ageing = await request.get("/api/v1/inventory/ageing?page=1&pageSize=1");
    expect(ageing.status()).toBe(401);
  });

  test("reports export creates tenant-scoped CSV and PDF files", async ({ page }) => {
    await login(page);
    await page.goto("/en/reports");
    await expect(page.getByText("Sales value")).toBeVisible();
    await expect(page.getByRole("button", { name: "Export CSV" })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeEnabled();

    const csv = await page.request.get("/api/v1/reports/export?format=csv&reportType=all");
    expect(csv.status()).toBe(200);
    expect(csv.headers()["content-type"]).toContain("text/csv");
    expect(await csv.text()).toContain("status");

    const pdf = await page.request.get("/api/v1/reports/export?format=pdf&reportType=all");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
  });

  test("mobile master data page has no page-level horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page);
    await page.goto("/en/master-data");
    await expect(page.getByRole("tablist", { name: "Master data resources" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(page.getByRole("button", { name: "Edit" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Audit" }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Deactivate" }).first()).toBeVisible();
  });

  test("AI read-only query endpoint is unavailable until AI service is running", async ({ page }) => {
    await login(page);
    try {
      const response = await page.request.get("http://localhost:8000/tools/safe-registry");
      expect([200, 503]).toContain(response.status());
    } catch (error) {
      expect(String(error)).toContain("ECONNREFUSED");
    }
  });
});

async function createInventoryProduct(
  page: import("@playwright/test").Page,
  code: string,
  name: string,
  category: string
): Promise<Record<string, string>> {
  const response = await page.request.post("/api/v1/master-data/products", {
    data: {
      code,
      name,
      category,
      baseUnit: "tonne",
      purchaseUnit: "tonne",
      salesUnit: "tonne",
      gstRate: 5,
      trackInventory: true,
      allowNegativeStock: false,
      active: true
    }
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function createStorageLocation(
  page: import("@playwright/test").Page,
  plantId: string,
  code: string,
  name: string
): Promise<Record<string, string>> {
  const response = await page.request.post("/api/v1/master-data/storageLocations", {
    data: {
      plantId,
      code,
      name,
      locationType: "stockpile",
      inventoryAllowed: true,
      negativeStockOverrideAllowed: false,
      active: true
    }
  });
  expect(response.status()).toBe(201);
  return response.json();
}

async function balanceQuantity(page: import("@playwright/test").Page, productId: string, storageLocationId: string): Promise<number> {
  return balanceField(page, productId, storageLocationId, "quantityBaseUnit");
}

async function balanceField(page: import("@playwright/test").Page, productId: string, storageLocationId: string, field: string): Promise<number> {
  const response = await page.request.get(`/api/v1/inventory/balances?productId=${productId}&storageLocationId=${storageLocationId}&page=1&pageSize=1`);
  expect(response.status()).toBe(200);
  const body = await response.json();
  return Number(body.rows[0]?.[field] ?? 0);
}
