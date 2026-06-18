import { NextResponse } from "next/server";
import { z } from "zod";
import {
  inventoryToCsv,
  listInventoryValuation
} from "@crushermitra/database";
import { renderTablePdf } from "@crushermitra/reporting";
import { inventoryQuerySchema } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../lib/database-errors";
import { assertInventoryRead, toTenantContext } from "../permissions";

const querySchema = inventoryQuerySchema.extend({
  export: z.enum(["csv", "pdf"]).optional(),
  format: z.enum(["csv", "pdf"]).optional()
});

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
    return jsonError("Invalid query parameters", 400);
  }

  try {
    const result = await listInventoryValuation(toTenantContext(session), parsedQuery.data);
    const format = parsedQuery.data.format ?? parsedQuery.data.export;

    if (format === "csv") {
      return new Response(inventoryToCsv(result), {
        headers: {
          "content-disposition": 'attachment; filename="inventory-valuation.csv"',
          "content-type": "text/csv; charset=utf-8"
        }
      });
    }

    if (format === "pdf") {
      const pdf = renderTablePdf({
        title: "Inventory valuation",
        subtitle: "Tenant-scoped CrusherMitra AI inventory valuation",
        summary: [
          ["Rows", result.total],
          ["Quantity", result.totalQuantityBaseUnit],
          ["Value", `Rs. ${result.totalValue.toLocaleString("en-IN")}`]
        ],
        headers: ["Code", "Product", "Location", "Qty", "Unit", "Rate", "Value"],
        rows: result.rows.map((row) => [
          String(row.productCode ?? ""),
          String(row.productName ?? ""),
          String(row.storageLocationName ?? ""),
          Number(row.quantityBaseUnit ?? 0),
          String(row.baseUnit ?? ""),
          Number(row.valuationRate ?? 0),
          Number(row.valuationAmount ?? 0)
        ])
      });
      return new Response(pdfBody(pdf), {
        headers: {
          "content-disposition": 'attachment; filename="inventory-valuation.pdf"',
          "content-type": "application/pdf"
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError("Unable to load inventory valuation", 500);
  }
}

function jsonError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

function pdfBody(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return body;
}
