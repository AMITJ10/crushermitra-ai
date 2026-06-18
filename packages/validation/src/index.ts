import { z } from "zod";

export function normaliseBusinessCode(value: string): string {
  return value.trim().replace(/\s+/g, "-").toUpperCase();
}

export function normaliseVehicleRegistration(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatVehicleRegistration(value: string): string {
  const normalised = normaliseVehicleRegistration(value);
  const match = /^([A-Z]{2})([0-9]{1,2})([A-Z]{1,3})([0-9]{1,4})$/.exec(normalised);

  return match ? `${match[1]} ${match[2]} ${match[3]} ${match[4]}` : normalised;
}

const trimmedString = (min = 1, max = 200) =>
  z.string().trim().min(min).max(max);

export const indianMobileSchema = z
  .string()
  .trim()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number.");

export const panSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN.");

export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, "Enter a valid GSTIN.");

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "Enter valid 6 digit PIN code.");

export const organisationOnboardingSchema = z.object({
  legalName: z.string().min(2).max(200),
  tradeName: z.string().min(2).max(200),
  pan: panSchema,
  gstin: gstinSchema.optional(),
  phone: indianMobileSchema,
  email: z.string().email(),
  state: z.string().min(2),
  district: z.string().min(2),
  pincode: pincodeSchema,
  defaultLanguage: z.enum(["en", "hi", "mr", "gu", "kn", "te", "ta"]),
  defaultCurrency: z.literal("INR")
});

export const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(256)
});

export const signupSchema = z.object({
  fullName: trimmedString(2, 120),
  email: z.string().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(256),
  confirmPassword: z.string().min(8).max(256),
  organisationName: trimmedString(2, 200),
  mobile: indianMobileSchema,
  businessType: z.enum(["stone_crusher", "rmc_plant", "crusher_rmc", "quarry", "aggregate_supplier", "transporter"]),
  state: trimmedString(2, 80).default("Maharashtra"),
  district: trimmedString(2, 80).default("Pune"),
  defaultPlantName: trimmedString(2, 160).optional(),
  termsAccepted: z.coerce.boolean(),
  locale: z.enum(["en", "hi", "mr"]).default("en"),
  pan: panSchema.optional(),
  pincode: pincodeSchema
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords must match."
    });
  }

  if (!value.termsAccepted) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["termsAccepted"],
      message: "Terms must be accepted."
    });
  }
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
  locale: z.enum(["en", "hi", "mr"]).default("en")
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(256),
  password: z.string().min(8, "Password must be at least 8 characters.").max(256),
  confirmPassword: z.string().min(8).max(256),
  locale: z.enum(["en", "hi", "mr"]).default("en")
}).superRefine((value, context) => {
  if (value.password !== value.confirmPassword) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["confirmPassword"],
      message: "Passwords must match."
    });
  }
});

export const plantSelectionSchema = z.object({
  plantId: z.string().uuid()
});

export const uuidSchema = z.string().uuid();

export const paginationQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "inactive", "all"]).default("active"),
  plantId: uuidSchema.optional(),
  type: z.string().max(80).optional(),
  sort: z.string().max(80).optional(),
  export: z.enum(["csv"]).optional()
});

export const customerSchema = z.object({
  code: trimmedString(2, 40).transform(normaliseBusinessCode),
  customerType: z.enum(["builder", "contractor", "rmc_plant", "road_contractor", "government", "infrastructure", "dealer", "retail", "internal_company", "individual", "other"]),
  legalName: trimmedString(2, 200),
  tradeName: trimmedString(2, 200),
  contactPerson: trimmedString(2, 120),
  phone: indianMobileSchema,
  whatsappNumber: indianMobileSchema.optional(),
  email: z.string().email().optional(),
  gstin: gstinSchema.optional(),
  pan: panSchema.optional(),
  billingAddress: trimmedString(5, 500),
  state: trimmedString(2, 80),
  district: trimmedString(2, 80),
  pincode: pincodeSchema,
  creditLimit: z.coerce.number().min(0).max(100000000),
  creditDays: z.coerce.number().int().min(0).max(365),
  defaultPriceList: z.string().trim().max(120).optional(),
  accountManager: z.string().trim().max(120).optional(),
  active: z.coerce.boolean().default(true),
  notes: z.string().max(1000).optional()
});

export const customerSiteSchema = z.object({
  customerId: uuidSchema,
  siteCode: trimmedString(2, 40).transform(normaliseBusinessCode),
  siteName: trimmedString(2, 200),
  contactPerson: trimmedString(2, 120),
  phone: indianMobileSchema,
  address: trimmedString(5, 500),
  state: trimmedString(2, 80),
  district: trimmedString(2, 80),
  pincode: pincodeSchema,
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  deliveryInstructions: z.string().trim().max(500).optional(),
  defaultUnloadingMinutes: z.coerce.number().int().min(0).max(1440).optional(),
  active: z.coerce.boolean().default(true)
});

export const supplierSchema = z.object({
  code: trimmedString(2, 40).transform(normaliseBusinessCode),
  supplierType: z.enum([
    "raw_stone",
    "cement",
    "fly_ash",
    "ggbs",
    "sand",
    "aggregate",
    "admixture",
    "diesel",
    "spare_parts",
    "transport",
    "maintenance",
    "laboratory",
    "other"
  ]),
  legalName: trimmedString(2, 200),
  tradeName: trimmedString(2, 200),
  contactPerson: trimmedString(2, 120),
  phone: indianMobileSchema,
  whatsappNumber: indianMobileSchema.optional(),
  email: z.string().email().optional(),
  gstin: gstinSchema.optional(),
  pan: panSchema.optional(),
  address: trimmedString(5, 500),
  state: trimmedString(2, 80),
  district: trimmedString(2, 80),
  pincode: pincodeSchema,
  creditDays: z.coerce.number().int().min(0).max(365),
  paymentTerms: z.string().trim().max(500).optional(),
  materialCategories: z.array(z.string().trim().min(1).max(80)).default([]),
  notes: z.string().trim().max(1000).optional(),
  active: z.coerce.boolean().default(true)
});

export const productSchema = z.object({
  code: trimmedString(2, 40).transform(normaliseBusinessCode),
  name: trimmedString(2, 160),
  localLanguageName: z.string().max(160).optional(),
  category: z.enum([
    "raw_stone",
    "crusher_output",
    "rmc_raw_material",
    "finished_concrete",
    "spare_part",
    "fuel",
    "consumable",
    "service",
    "waste",
    "other"
  ]),
  description: z.string().max(500).optional(),
  hsnOrSacCode: z.string().max(20).optional(),
  gstRate: z.coerce.number().min(0).max(28).optional(),
  baseUnit: z.string().min(1).max(40),
  purchaseUnit: z.string().min(1).max(40),
  salesUnit: z.string().min(1).max(40),
  bulkDensity: z.coerce.number().positive().optional(),
  minStock: z.coerce.number().min(0).optional(),
  maxStock: z.coerce.number().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  standardCost: z.coerce.number().min(0).optional(),
  defaultSellingPrice: z.coerce.number().min(0).optional(),
  trackInventory: z.coerce.boolean().default(true),
  allowNegativeStock: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true)
}).superRefine((value, context) => {
  if (value.maxStock !== undefined && value.minStock !== undefined && value.minStock > value.maxStock) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["minStock"],
      message: "Minimum stock cannot exceed maximum stock."
    });
  }

  if (value.reorderLevel !== undefined && value.maxStock !== undefined && value.reorderLevel > value.maxStock) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["reorderLevel"],
      message: "Reorder level cannot exceed maximum stock."
    });
  }
});

export const productUnitSchema = z.object({
  productId: uuidSchema,
  fromUnit: trimmedString(1, 40).transform((value) => value.toLowerCase()),
  toUnit: trimmedString(1, 40).transform((value) => value.toLowerCase()),
  factor: z.coerce.number().positive(),
  effectiveFrom: z.string().date().optional(),
  effectiveTo: z.string().date().optional(),
  notes: z.string().trim().max(500).optional(),
  active: z.coerce.boolean().default(true)
}).superRefine((value, context) => {
  if (value.fromUnit === value.toUnit) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toUnit"],
      message: "From and to units cannot be identical."
    });
  }
});

export const productPriceSchema = z.object({
  productId: uuidSchema,
  priceType: z.enum(["sale", "purchase", "transport"]),
  unit: z.string().min(1).max(40),
  rate: z.coerce.number().min(0),
  effectiveFrom: z.string().date(),
  effectiveTo: z.string().date().optional(),
  active: z.coerce.boolean().default(true)
});

export const vehicleSchema = z.object({
  registrationNumber: z.string().min(6).max(30).transform(normaliseVehicleRegistration).pipe(z.string().regex(/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/, "Enter a valid Indian registration number.")),
  vehicleCode: z.string().trim().max(40).optional(),
  vehicleType: z.enum(["tipper", "dumper", "truck", "transit_mixer", "loader", "excavator", "concrete_pump", "tanker", "tractor", "utility", "other"]),
  ownerType: z.enum(["owned", "supplier", "customer", "market"]),
  ownerName: trimmedString(2, 160),
  plantId: uuidSchema.optional(),
  capacity: z.coerce.number().positive().optional(),
  capacityUnit: z.string().trim().max(40).optional(),
  capacityTonne: z.coerce.number().positive().optional(),
  capacityCubicMetre: z.coerce.number().positive().optional(),
  manufacturer: z.string().trim().max(120).optional(),
  model: z.string().trim().max(120).optional(),
  manufacturingYear: z.coerce.number().int().min(1950).max(2100).optional(),
  fuelType: z.string().trim().max(40).optional(),
  chassisNumber: z.string().trim().max(120).optional(),
  engineNumber: z.string().trim().max(120).optional(),
  active: z.coerce.boolean().default(true)
});

export const driverSchema = z.object({
  code: trimmedString(2, 40).transform(normaliseBusinessCode),
  name: trimmedString(2, 160),
  phone: indianMobileSchema,
  alternatePhone: indianMobileSchema.optional(),
  licenceNumber: trimmedString(4, 60).transform((value) => value.toUpperCase()),
  licenceType: z.string().trim().max(60).optional(),
  licenceExpiry: z.string().date().optional(),
  address: z.string().trim().max(500).optional(),
  plantId: uuidSchema.optional(),
  assignedVehicleId: uuidSchema.optional(),
  emergencyContact: z.string().trim().max(160).optional(),
  active: z.coerce.boolean().default(true)
});

export const machineSchema = z.object({
  plantId: uuidSchema,
  code: trimmedString(2, 40).transform(normaliseBusinessCode),
  name: trimmedString(2, 160),
  machineType: z.enum(["crusher", "screen", "conveyor", "batching_plant", "loader", "weighbridge", "generator", "other"]),
  assetType: z.enum(["jaw_crusher", "cone_crusher", "impact_crusher", "vsi", "feeder", "vibrating_screen", "conveyor", "motor", "gearbox", "bearing_assembly", "pump", "compressor", "generator", "transformer", "loader", "transit_mixer", "batching_plant", "weighbridge", "dust_control", "silo", "laboratory_equipment", "other"]).optional(),
  parentMachineId: uuidSchema.optional(),
  make: z.string().max(120).optional(),
  manufacturer: z.string().max(120).optional(),
  model: z.string().max(120).optional(),
  serialNumber: z.string().max(120).optional(),
  commissioningDate: z.string().date().optional(),
  capacity: z.coerce.number().positive().optional(),
  capacityUnit: z.string().trim().max(40).optional(),
  meterType: z.string().trim().max(80).optional(),
  initialMeterValue: z.coerce.number().min(0).optional(),
  warrantyExpiry: z.string().date().optional(),
  notes: z.string().trim().max(1000).optional(),
  active: z.coerce.boolean().default(true)
});

export const storageLocationSchema = z.object({
  plantId: uuidSchema,
  code: trimmedString(2, 40).transform(normaliseBusinessCode),
  name: trimmedString(2, 160),
  locationType: z.enum(["raw_material_yard", "finished_stockpile", "aggregate_bin", "cement_silo", "fly_ash_silo", "ggbs_silo", "admixture_tank", "water_tank", "spare_parts_store", "fuel_tank", "transit", "waste_area", "stockpile", "bin", "silo", "yard", "tank", "warehouse", "other"]),
  parentLocationId: uuidSchema.optional(),
  capacity: z.coerce.number().min(0).optional(),
  capacityUnit: z.string().trim().max(40).optional(),
  inventoryAllowed: z.coerce.boolean().default(true),
  negativeStockOverrideAllowed: z.coerce.boolean().default(false),
  notes: z.string().trim().max(1000).optional(),
  active: z.coerce.boolean().default(true)
});

export const shiftSchema = z.object({
  plantId: uuidSchema,
  code: trimmedString(1, 40).transform(normaliseBusinessCode),
  name: trimmedString(2, 160),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid start time."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Enter a valid end time."),
  crossesMidnight: z.coerce.boolean().default(false),
  breakDurationMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  activeDays: z.array(z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"])).default(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  notes: z.string().trim().max(1000).optional(),
  active: z.coerce.boolean().default(true)
}).superRefine((value, context) => {
  if (!value.crossesMidnight && value.startTime >= value.endTime) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endTime"],
      message: "End time must be after start time unless the shift crosses midnight."
    });
  }

  if (value.crossesMidnight && value.startTime <= value.endTime) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["crossesMidnight"],
      message: "Cross-midnight shifts must end on the next day."
    });
  }
});

export const masterDataSchemas = {
  customers: customerSchema,
  customerSites: customerSiteSchema,
  suppliers: supplierSchema,
  products: productSchema,
  productUnits: productUnitSchema,
  productPrices: productPriceSchema,
  vehicles: vehicleSchema,
  drivers: driverSchema,
  machines: machineSchema,
  storageLocations: storageLocationSchema,
  shifts: shiftSchema
} as const;

export type MasterDataResource = keyof typeof masterDataSchemas;

const workflowStatusSchema = z.enum(["draft", "confirmed", "approved", "ready", "dispatched", "completed", "cancelled"]);

export const orderSchema = z.object({
  customerId: uuidSchema,
  customerSiteId: uuidSchema.optional(),
  productId: uuidSchema,
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(40),
  rate: z.coerce.number().min(0),
  paidAmount: z.coerce.number().min(0).default(0),
  orderDate: z.string().date(),
  expectedDispatchDate: z.string().date().optional(),
  status: workflowStatusSchema.default("draft"),
  notes: z.string().max(1000).optional()
});

export const dispatchSchema = z.object({
  orderId: uuidSchema.optional(),
  customerId: uuidSchema,
  customerSiteId: uuidSchema.optional(),
  vehicleId: uuidSchema.optional(),
  driverId: uuidSchema.optional(),
  productId: uuidSchema,
  sourceStorageLocationId: uuidSchema,
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(40),
  dispatchDate: z.string().date(),
  firstWeight: z.coerce.number().min(0),
  secondWeight: z.coerce.number().min(0),
  rate: z.coerce.number().min(0).default(0),
  paymentStatus: z.enum(["pending", "partial", "paid", "failed"]).default("pending"),
  paidAmount: z.coerce.number().min(0).default(0),
  status: z.enum(["draft", "ready", "dispatched", "delivered", "cancelled"]).default("draft"),
  deliveryChallanNumber: z.string().max(80).optional(),
  notes: z.string().max(1000).optional()
});

export const operationSchema = z.object({
  operationType: z.enum([
    "crusher_shift_run",
    "rmc_batch",
    "stock_movement",
    "quality_check",
    "machine_downtime",
    "approval"
  ]),
  productId: uuidSchema.optional(),
  machineId: uuidSchema.optional(),
  quantity: z.coerce.number().min(0).optional(),
  unit: z.string().max(40).optional(),
  productionCost: z.coerce.number().min(0).default(0),
  materialCost: z.coerce.number().min(0).default(0),
  machineCost: z.coerce.number().min(0).default(0),
  operationDate: z.string().date(),
  status: z.enum(["draft", "pending", "approved", "completed", "cancelled"]).default("draft"),
  notes: z.string().max(1000).optional()
});

export const billingRecordSchema = z.object({
  customerId: uuidSchema,
  invoiceNumber: z.string().min(2).max(80),
  billingDate: z.string().date(),
  dueDate: z.string().date().optional(),
  amount: z.coerce.number().min(0),
  planAmount: z.coerce.number().min(0).default(0),
  paymentAmount: z.coerce.number().min(0).default(0),
  paymentMethod: z.enum(["upi", "upi_autopay", "debit_card", "credit_card", "net_banking", "bank_transfer"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed"]).default("pending"),
  status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).default("draft"),
  notes: z.string().max(1000).optional()
});

export const workflowSchemas = {
  orders: orderSchema,
  dispatches: dispatchSchema,
  operations: operationSchema,
  billing: billingRecordSchema
} as const;

export type WorkflowResource = keyof typeof workflowSchemas;

const positiveQuantitySchema = z.coerce.number().positive().max(100000000);
const inventoryLineSchema = z.object({
  storageLocationId: uuidSchema,
  productId: uuidSchema,
  quantity: positiveQuantitySchema,
  unit: z.string().trim().min(1).max(40),
  conversionFactor: z.coerce.number().positive().optional()
});

export const inventoryQuerySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  plantId: uuidSchema.optional(),
  productId: uuidSchema.optional(),
  storageLocationId: uuidSchema.optional(),
  sourceType: z.string().max(80).optional(),
  lowStockOnly: z.coerce.boolean().optional(),
  export: z.enum(["csv"]).optional()
});

export const purchaseReceiptSchema = z.object({
  plantId: uuidSchema.optional(),
  supplierId: uuidSchema.optional(),
  storageLocationId: uuidSchema,
  productId: uuidSchema,
  receiptDate: z.string().date(),
  sourceDocumentNumber: z.string().trim().max(120).optional(),
  quantity: positiveQuantitySchema,
  unit: z.string().trim().min(1).max(40),
  conversionFactor: z.coerce.number().positive().optional(),
  unitCost: z.coerce.number().min(0).optional(),
  notes: z.string().trim().max(1000).optional()
});

export const stockMovementSchema = z.object({
  plantId: uuidSchema.optional(),
  fromStorageLocationId: uuidSchema,
  toStorageLocationId: uuidSchema,
  productId: uuidSchema,
  movementDate: z.string().date(),
  quantity: positiveQuantitySchema,
  unit: z.string().trim().min(1).max(40),
  conversionFactor: z.coerce.number().positive().optional(),
  reason: z.string().trim().min(5).max(1000),
  requiresApproval: z.coerce.boolean().default(false)
}).superRefine((value, context) => {
  if (value.fromStorageLocationId === value.toStorageLocationId) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["toStorageLocationId"],
      message: "Destination must be different from source."
    });
  }
});

export const productionRunSchema = z.object({
  plantId: uuidSchema.optional(),
  machineId: uuidSchema.optional(),
  runType: z.enum(["crusher", "rmc"]),
  productionDate: z.string().date(),
  inputs: z.array(inventoryLineSchema).min(1),
  outputs: z.array(inventoryLineSchema).min(1),
  notes: z.string().trim().max(1000).optional()
});

export const dispatchStockReductionSchema = z.object({
  plantId: uuidSchema.optional(),
  dispatchId: uuidSchema.optional(),
  storageLocationId: uuidSchema,
  productId: uuidSchema,
  dispatchDate: z.string().date(),
  quantity: positiveQuantitySchema,
  unit: z.string().trim().min(1).max(40),
  conversionFactor: z.coerce.number().positive().optional(),
  reason: z.string().trim().max(1000).optional()
});

export const inventoryCorrectionSchema = z.object({
  plantId: uuidSchema.optional(),
  storageLocationId: uuidSchema,
  productId: uuidSchema,
  correctedQuantityBaseUnit: z.coerce.number().min(0).max(100000000),
  reason: z.string().trim().min(10).max(1000)
});

export const inventoryClosePeriodSchema = z.object({
  plantId: uuidSchema.optional(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  reason: z.string().trim().min(10).max(1000)
}).superRefine((value, context) => {
  if (value.periodEnd < value.periodStart) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["periodEnd"],
      message: "Period end must be on or after period start."
    });
  }
});

export const inventoryReservationExpirySchema = z.object({
  plantId: uuidSchema.optional(),
  now: z.string().datetime().optional()
});

export const inventoryReservationReallocationSchema = z.object({
  orderId: uuidSchema,
  reservedUntil: z.string().datetime().optional()
});

export const accountSubscriptionSchema = z.object({
  planCode: z.enum(["starter", "growth", "enterprise"]),
  status: z.enum(["active", "trialing", "past_due", "cancelled"]).default("active"),
  monthlyOrderLimit: z.coerce.number().int().min(0),
  monthlyDispatchLimit: z.coerce.number().int().min(0),
  userLimit: z.coerce.number().int().min(1),
  currentPeriodStart: z.string().date(),
  currentPeriodEnd: z.string().date().optional(),
  paymentStatus: z.enum(["not_configured", "pending", "paid", "failed"]).default("not_configured")
});

export const aiRecommendationSchema = z.object({
  plantId: uuidSchema.optional(),
  recommendationType: z.enum(["advisory", "cost", "production", "safety", "maintenance", "compliance"]),
  title: z.string().min(2).max(160),
  summary: z.string().min(5).max(2000),
  estimatedImpact: z.string().max(500).optional(),
  status: z.enum(["draft", "pending_approval", "accepted", "rejected", "archived"]).default("draft"),
  humanConfirmationRequired: z.coerce.boolean().default(true),
  sourceRefs: z.array(z.record(z.string(), z.unknown())).default([])
});

export const approvalRequestSchema = z.object({
  plantId: uuidSchema.optional(),
  requestType: z.enum(["rate_override", "credit_exception", "stock_adjustment", "payment_correction", "ai_action", "invoice_cancellation"]),
  sourceType: z.string().max(80).optional(),
  sourceId: uuidSchema.optional(),
  originalValue: z.record(z.string(), z.unknown()).optional(),
  requestedValue: z.record(z.string(), z.unknown()).optional(),
  reason: z.string().min(5).max(1000),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("pending")
});

export const notificationEventSchema = z.object({
  plantId: uuidSchema.optional(),
  channel: z.enum(["whatsapp", "sms", "email"]),
  recipient: z.string().min(3).max(254),
  templateKey: z.string().min(2).max(120),
  payload: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["queued", "sent", "delivered", "failed"]).default("queued")
});

export const reportExportSchema = z.object({
  plantId: uuidSchema.optional(),
  moduleName: z.enum(["orders", "dispatch", "operations", "billing", "admin", "audit"]),
  exportFormat: z.enum(["csv", "pdf"]),
  title: z.string().min(2).max(160),
  filters: z.record(z.string(), z.unknown()).default({})
});
