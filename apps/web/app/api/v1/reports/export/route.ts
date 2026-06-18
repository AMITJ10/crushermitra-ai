import { NextResponse } from "next/server";
import { z } from "zod";
import { listWorkflowData, workflowsToCsv, type WorkflowListResult } from "@crushermitra/database";
import { assertPermission } from "@crushermitra/permissions";
import { renderTablePdf } from "@crushermitra/reporting";
import { getCurrentSession } from "../../../../../lib/session";
import { databaseUnavailableMessage, isDatabaseUnavailable } from "../../../../../lib/database-errors";
import { toTenantContext } from "../../workflows/permissions";

const querySchema = z.object({
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  status: z.string().optional(),
  customerId: z.string().optional(),
  productId: z.string().optional(),
  vehicleId: z.string().optional(),
  driverId: z.string().optional(),
  reportType: z.enum(["all", "sales", "production", "dispatch", "receivables", "payments", "inventory"]).default("all"),
  format: z.enum(["csv", "pdf"]).default("pdf")
});

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  try {
    assertPermission(session, "report.export", {
      organisationId: session.organisationId,
      plantId: session.activePlantId
    });
  } catch {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const parsedQuery = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid report filters" }, { status: 400 });
  }

  try {
    const results = await loadReportData(session, parsedQuery.data);
    const rows = results.flatMap((result) => result.rows.map((row) => normaliseReportRow(result.resource, row)));

    if (parsedQuery.data.format === "csv") {
      return new Response(
        results.map((result) => workflowsToCsv(result, result.resource, parsedQuery.data)).join("\n\n"),
        {
          headers: {
            "content-disposition": 'attachment; filename="crushermitra-report.csv"',
            "content-type": "text/csv; charset=utf-8"
          }
        }
      );
    }

    const pdf = renderTablePdf({
      title: "CrusherMitra AI report",
      subtitle: `Report type: ${parsedQuery.data.reportType}`,
      summary: [["Rows", rows.length]],
      headers: ["Date", "Module", "Customer", "Product", "Qty", "Amount", "Status"],
      rows: rows.map((row) => [row.date, row.module, row.customer, row.product, row.quantity, row.amount, row.status])
    });

    return new Response(pdfBody(pdf), {
      headers: {
        "content-disposition": 'attachment; filename="crushermitra-report.pdf"',
        "content-type": "application/pdf"
      }
    });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: databaseUnavailableMessage }, { status: 503 });
    }
    return NextResponse.json({ error: "Unable to export report" }, { status: 500 });
  }
}

async function loadReportData(
  session: NonNullable<Awaited<ReturnType<typeof getCurrentSession>>>,
  filters: z.infer<typeof querySchema>
): Promise<WorkflowListResult[]> {
  const context = toTenantContext(session);
  const base = {
    page: 1,
    pageSize: 100,
    fromDate: filters.fromDate,
    toDate: filters.toDate,
    status: filters.status
  };
  const resources = filters.reportType === "sales"
    ? ["orders" as const]
    : filters.reportType === "dispatch"
      ? ["dispatches" as const]
      : filters.reportType === "production"
        ? ["operations" as const]
        : filters.reportType === "payments" || filters.reportType === "receivables"
          ? ["billing" as const]
          : ["orders" as const, "dispatches" as const, "operations" as const, "billing" as const];

  return Promise.all(resources.map((resource) => listWorkflowData(context, resource, base)));
}

function normaliseReportRow(resource: string, row: Record<string, unknown>) {
  return {
    amount: Number(row.totalAmount ?? row.dispatchAmount ?? row.amount ?? row.productionCost ?? 0),
    customer: String(row.customerName ?? ""),
    date: String(row.orderDate ?? row.dispatchDate ?? row.operationDate ?? row.billingDate ?? row.createdAt ?? "").slice(0, 10),
    module: resource,
    product: String(row.productName ?? row.invoiceNumber ?? row.operationType ?? ""),
    quantity: Number(row.quantity ?? row.netWeight ?? 0),
    status: String(row.status ?? row.paymentStatus ?? "")
  };
}

function pdfBody(bytes: Uint8Array): ArrayBuffer {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return body;
}
