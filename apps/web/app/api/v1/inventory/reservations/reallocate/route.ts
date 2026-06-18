import { NextResponse } from "next/server";
import { z } from "zod";
import { reallocateOrderReservations } from "@crushermitra/database";
import { inventoryReservationReallocationSchema } from "@crushermitra/validation";
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

  const parsedBody = inventoryReservationReallocationSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return jsonError(formatValidationError(parsedBody.error), 400);
  }

  try {
    const row = await reallocateOrderReservations(toTenantContext(session), parsedBody.data.orderId, {
      reservedUntil: parsedBody.data.reservedUntil
    });
    return NextResponse.json(row);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(error instanceof Error ? error.message : "Unable to reallocate reservation", 400);
  }
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`).join("; ");
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
