import { NextResponse } from "next/server";
import { z } from "zod";
import { createDispatchStockReduction } from "@crushermitra/database";
import { dispatchStockReductionSchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../lib/database-errors";
import { assertDispatchComplete, toTenantContext } from "../permissions";

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return jsonError("Unauthenticated", 401);
  }

  try {
    assertDispatchComplete(session);
  } catch {
    return jsonError("Permission denied", 403);
  }

  const parsedBody = dispatchStockReductionSchema.safeParse(await request.json());
  if (!parsedBody.success) {
    return jsonError(formatValidationError(parsedBody.error), 400);
  }

  try {
    const row = await createDispatchStockReduction(toTenantContext(session), parsedBody.data);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError(getPublicError(error), 400);
  }
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`).join("; ");
}

function getPublicError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to post dispatch stock reduction";
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
