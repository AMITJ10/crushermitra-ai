import { NextResponse } from "next/server";
import { approveInventoryCorrection } from "@crushermitra/database";
import { uuidSchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../../../lib/database-errors";
import { assertInventoryAdjust, toTenantContext } from "../../../permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();
  if (!session) {
    return jsonError("Unauthenticated", 401);
  }

  try {
    assertInventoryAdjust(session);
  } catch {
    return jsonError("Permission denied", 403);
  }

  const { id } = await context.params;
  const parsedId = uuidSchema.safeParse(id);
  if (!parsedId.success) {
    return jsonError("Invalid correction id", 400);
  }

  try {
    const row = await approveInventoryCorrection(toTenantContext(session), parsedId.data);
    return NextResponse.json(row);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(getPublicError(error), 400);
  }
}

function getPublicError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to approve inventory correction";
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
