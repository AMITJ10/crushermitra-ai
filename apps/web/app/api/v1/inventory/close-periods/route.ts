import { NextResponse } from "next/server";
import { z } from "zod";
import { closeInventoryPeriod, listInventoryClosePeriods } from "@crushermitra/database";
import { inventoryClosePeriodSchema, inventoryQuerySchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../lib/database-errors";
import { assertInventoryAdjust, assertInventoryRead, toTenantContext } from "../permissions";

const querySchema = inventoryQuerySchema.pick({ page: true, pageSize: true, plantId: true });

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return jsonError("Unauthenticated", 401);
  }

  try {
    assertInventoryRead(session);
  } catch {
    return jsonError("Permission denied", 403);
  }

  const parsedQuery = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) {
    return jsonError(formatValidationError(parsedQuery.error), 400);
  }

  try {
    return NextResponse.json(await listInventoryClosePeriods(toTenantContext(session), parsedQuery.data));
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError("Unable to load inventory close periods", 500);
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return jsonError("Unauthenticated", 401);
  }

  try {
    assertInventoryAdjust(session);
  } catch {
    return jsonError("Permission denied", 403);
  }

  const parsedBody = inventoryClosePeriodSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return jsonError(formatValidationError(parsedBody.error), 400);
  }

  try {
    const row = await closeInventoryPeriod(toTenantContext(session), parsedBody.data);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(error instanceof Error ? error.message : "Unable to close inventory period", 400);
  }
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`).join("; ");
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
