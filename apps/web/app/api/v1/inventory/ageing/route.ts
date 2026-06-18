import { NextResponse } from "next/server";
import { z } from "zod";
import { inventoryToCsv, listInventoryAgeing } from "@crushermitra/database";
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
    const result = await listInventoryAgeing(toTenantContext(session), parsedQuery.data);
    const format = parsedQuery.data.format ?? parsedQuery.data.export;

    if (format === "csv") {
      return new Response(inventoryToCsv(result), {
        headers: {
          "content-disposition": 'attachment; filename="inventory-ageing.csv"',
          "content-type": "text/csv; charset=utf-8"
        }
      });
    }

    if (format === "pdf") {
      const pdf = renderTablePdf({
        title: "Inventory ageing",
        subtitle: "Tenant-scoped CrusherMitra AI stock ageing",
        summary: [
          ["0-7 days", result.buckets.days0To7],
          ["8-30 days", result.buckets.days8To30],
          ["31-90 days", result.buckets.days31To90],
          ["Over 90 days", result.buckets.daysOver90]
        ],
        headers: ["Code", "Product", "Location", "Qty", "Reserved", "Available", "Age"],
        rows: result.rows.map((row) => [
          String(row.productCode ?? ""),
          String(row.productName ?? ""),
          String(row.storageLocationName ?? ""),
          Number(row.quantityBaseUnit ?? 0),
          Number(row.reservedQuantityBaseUnit ?? 0),
          Number(row.availableQuantityBaseUnit ?? 0),
          String(row.ageBucket ?? "")
        ])
      });
      return new Response(pdfBody(pdf), {
        headers: {
          "content-disposition": 'attachment; filename="inventory-ageing.pdf"',
          "content-type": "application/pdf"
        }
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return jsonError(databaseUnavailableMessage, 503);
    }
    return jsonError("Unable to load inventory ageing", 500);
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
