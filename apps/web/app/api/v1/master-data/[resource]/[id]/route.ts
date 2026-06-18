import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteMasterData,
  isMasterDataResource,
  listMasterDataAuditHistory,
  updateMasterData
} from "@crushermitra/database";
import { masterDataSchemas, uuidSchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../../lib/session";
import {
  databaseUnavailableMessage,
  isDatabaseUnavailable
} from "../../../../../../lib/database-errors";
import {
  assertMasterDataAudit,
  assertMasterDataUpdate,
  toTenantContext
} from "../../permissions";

interface RouteContext {
  params: Promise<{ resource: string; id: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return jsonError("UNAUTHENTICATED", "Unauthenticated", 401);
  }

  const { resource, id } = await context.params;

  if (!isMasterDataResource(resource) || !uuidSchema.safeParse(id).success) {
    return jsonError("MASTER_DATA_RESOURCE_NOT_FOUND", "Unknown master data resource", 404);
  }

  if (new URL(request.url).searchParams.get("history") !== "audit") {
    return jsonError("UNSUPPORTED_DETAIL_REQUEST", "Unsupported master data detail request", 400);
  }

  try {
    assertMasterDataAudit(session);
  } catch {
    return jsonError("PERMISSION_DENIED", "Permission denied", 403);
  }

  let events;
  try {
    events = await listMasterDataAuditHistory(toTenantContext(session), resource, id);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError("DATABASE_UNAVAILABLE", databaseUnavailableMessage, 503);
    }
    return jsonError("MASTER_DATA_AUDIT_FAILED", "Unable to load audit history", 500);
  }
  return NextResponse.json({ events });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return jsonError("UNAUTHENTICATED", "Unauthenticated", 401);
  }

  const { resource, id } = await context.params;

  if (!isMasterDataResource(resource) || !uuidSchema.safeParse(id).success) {
    return jsonError("MASTER_DATA_RESOURCE_NOT_FOUND", "Unknown master data resource", 404);
  }

  try {
    assertMasterDataUpdate(session, resource);
  } catch {
    return jsonError("PERMISSION_DENIED", "Permission denied", 403);
  }

  const schema: z.ZodTypeAny = masterDataSchemas[resource];
  const parsedBody = schema.safeParse(await request.json());

  if (!parsedBody.success) {
    return jsonError("VALIDATION_FAILED", formatValidationError(parsedBody.error), 400);
  }

  try {
    const row = await updateMasterData(
      toTenantContext(session),
      resource,
      id,
      parsedBody.data as Record<string, unknown>
    );

    return NextResponse.json(row);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError("DATABASE_UNAVAILABLE", databaseUnavailableMessage, 503);
    }
    return toMasterDataErrorResponse(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return jsonError("UNAUTHENTICATED", "Unauthenticated", 401);
  }

  const { resource, id } = await context.params;

  if (!isMasterDataResource(resource) || !uuidSchema.safeParse(id).success) {
    return jsonError("MASTER_DATA_RESOURCE_NOT_FOUND", "Unknown master data resource", 404);
  }

  try {
    assertMasterDataUpdate(session, resource);
  } catch {
    return jsonError("PERMISSION_DENIED", "Permission denied", 403);
  }

  try {
    const row = await deleteMasterData(toTenantContext(session), resource, id);
    return NextResponse.json(row);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError("DATABASE_UNAVAILABLE", databaseUnavailableMessage, 503);
    }
    return toMasterDataErrorResponse(error);
  }
}

function formatValidationError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
    .join("; ");
}

function toMasterDataErrorResponse(error: unknown): NextResponse {
  const pgError = error as { code?: string; constraint?: string };
  if (pgError.code === "23505") {
    const mapped = mapConstraint(pgError.constraint);
    return jsonError(mapped.code, mapped.message, 409, mapped.field);
  }

  if (error instanceof Error && error.message === "Record not found.") {
    return jsonError("MASTER_DATA_NOT_FOUND", "Record not found.", 404);
  }

  if (error instanceof Error && error.message.startsWith("Invalid reference")) {
    return jsonError("INVALID_REFERENCE", error.message, 422);
  }

  if (error instanceof Error && error.message.includes("hierarchy")) {
    return jsonError("INVALID_HIERARCHY", error.message, 422);
  }

  return jsonError("MASTER_DATA_SAVE_FAILED", "Unable to save master data", 400);
}

function mapConstraint(constraint?: string): { code: string; message: string; field?: string } {
  if (constraint?.includes("customer") && constraint.includes("gstin")) {
    return { code: "CUSTOMER_GSTIN_EXISTS", message: "Customer GSTIN already exists.", field: "gstin" };
  }
  if (constraint?.includes("customer")) {
    return { code: "CUSTOMER_CODE_EXISTS", message: "Customer code already exists.", field: "code" };
  }
  if (constraint?.includes("supplier") && constraint.includes("gstin")) {
    return { code: "SUPPLIER_GSTIN_EXISTS", message: "Supplier GSTIN already exists.", field: "gstin" };
  }
  if (constraint?.includes("supplier")) {
    return { code: "SUPPLIER_CODE_EXISTS", message: "Supplier code already exists.", field: "code" };
  }
  if (constraint?.includes("product_unit")) {
    return { code: "UNIT_CONVERSION_EXISTS", message: "An active unit conversion already exists.", field: "fromUnit" };
  }
  if (constraint?.includes("product")) {
    return { code: "PRODUCT_CODE_EXISTS", message: "Product code already exists.", field: "code" };
  }
  if (constraint?.includes("vehicle")) {
    return { code: "VEHICLE_REGISTRATION_EXISTS", message: "Vehicle registration already exists.", field: "registrationNumber" };
  }
  if (constraint?.includes("driver") && constraint.includes("licence")) {
    return { code: "DRIVER_LICENCE_EXISTS", message: "Driver licence number already exists.", field: "licenceNumber" };
  }
  if (constraint?.includes("driver")) {
    return { code: "DRIVER_CODE_EXISTS", message: "Driver code already exists.", field: "code" };
  }
  if (constraint?.includes("machine")) {
    return { code: "MACHINE_CODE_EXISTS", message: "Machine code already exists for this plant.", field: "code" };
  }
  if (constraint?.includes("storage")) {
    return { code: "STORAGE_LOCATION_CODE_EXISTS", message: "Storage location code already exists for this plant.", field: "code" };
  }
  if (constraint?.includes("shift")) {
    return { code: "SHIFT_CODE_EXISTS", message: "Shift code already exists for this plant.", field: "code" };
  }
  return { code: "MASTER_DATA_CONFLICT", message: "A duplicate master-data record already exists." };
}

function jsonError(code: string, message: string, status: number, field?: string): NextResponse {
  return NextResponse.json(
    { error: { code, message, field, requestId: createRequestId() } },
    { status }
  );
}

function createRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
