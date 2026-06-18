import { NextResponse } from "next/server";
import { z } from "zod";
import { expireStockReservations } from "@crushermitra/database";
import { inventoryReservationExpirySchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../../lib/database-errors";
import { assertInventoryAdjust, toTenantContext } from "../../permissions";

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

  const parsedBody = inventoryReservationExpirySchema.safeParse(await readJson(request));
  if (!parsedBody.success) {
    return jsonError(formatValidationError(parsedBody.error), 400);
  }

  try {
    return NextResponse.json(await expireStockReservations(toTenantContext(session), parsedBody.data));
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(error instanceof Error ? error.message : "Unable to expire reservations", 400);
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`).join("; ");
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
