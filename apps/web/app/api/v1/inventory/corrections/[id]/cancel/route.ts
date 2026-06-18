import { NextResponse } from "next/server";
import { z } from "zod";
import { cancelInventoryCorrection } from "@crushermitra/database";
import { uuidSchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../../../lib/database-errors";
import { assertInventoryAdjust, toTenantContext } from "../../../permissions";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const decisionSchema = z.object({
  reason: z.string().trim().min(5).max(1000)
});

export async function POST(request: Request, context: RouteContext) {
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
  const parsedBody = decisionSchema.safeParse(await request.json());
  if (!parsedId.success || !parsedBody.success) {
    return jsonError("Invalid cancellation request", 400);
  }

  try {
    return NextResponse.json(await cancelInventoryCorrection(toTenantContext(session), parsedId.data, parsedBody.data.reason));
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(error instanceof Error ? error.message : "Unable to cancel inventory correction", 400);
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
