import { NextResponse } from "next/server";
import { inventoryToCsv, listInventoryTransactions } from "@crushermitra/database";
import { inventoryQuerySchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../lib/database-errors";
import { assertInventoryRead, toTenantContext } from "../permissions";

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

  const parsedQuery = inventoryQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) {
    return jsonError("Invalid query parameters", 400);
  }

  try {
    const result = await listInventoryTransactions(toTenantContext(session), parsedQuery.data);
    if (parsedQuery.data.export === "csv") {
      return new Response(inventoryToCsv(result), {
        headers: {
          "content-disposition": 'attachment; filename="inventory-transactions.csv"',
          "content-type": "text/csv; charset=utf-8"
        }
      });
    }
    return NextResponse.json(result);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError("Unable to load inventory transactions", 500);
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
