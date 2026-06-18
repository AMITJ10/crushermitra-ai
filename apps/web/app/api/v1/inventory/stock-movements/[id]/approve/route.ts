import { NextResponse } from "next/server";
import { approveStockMovement } from "@crushermitra/database";
import { getCurrentSession } from "../../../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../../../lib/database-errors";
import { assertInventoryAdjust, toTenantContext } from "../../../permissions";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
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
  const payload = await readJson(request);

  try {
    const row = await approveStockMovement(toTenantContext(session), id, String(payload.reason ?? "Approved stock transfer"));
    return NextResponse.json(row);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(error instanceof Error ? error.message : "Unable to approve stock transfer", 400);
  }
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
