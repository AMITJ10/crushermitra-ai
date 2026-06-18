import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createWorkflowData,
  listWorkflowData,
  workflowsToCsv
} from "@crushermitra/database";
import { workflowSchemas } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../lib/session";
import {
  databaseUnavailableMessage,
  isDatabaseUnavailable
} from "../../../../../lib/database-errors";
import {
  assertWorkflowCreate,
  assertWorkflowRead,
  isWorkflowResource,
  toTenantContext
} from "../permissions";

const querySchema = z.object({
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  fromDate: z.string().date().optional(),
  toDate: z.string().date().optional(),
  status: z.string().optional(),
  customerId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  vehicleId: z.string().uuid().optional(),
  driverId: z.string().uuid().optional(),
  operationType: z.string().optional(),
  export: z.enum(["csv"]).optional()
});

interface RouteContext {
  params: Promise<{ resource: string }>;
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { resource } = await context.params;
  if (!isWorkflowResource(resource)) {
    return NextResponse.json({ error: "Unknown workflow resource" }, { status: 404 });
  }

  try {
    assertWorkflowRead(session, resource);
  } catch {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const parsedQuery = querySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsedQuery.success) {
    return NextResponse.json({ error: "Invalid query parameters" }, { status: 400 });
  }

  let result;
  try {
    result = await listWorkflowData(toTenantContext(session), resource, parsedQuery.data);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: databaseUnavailableMessage }, { status: 503 });
    }
    return NextResponse.json({ error: getPublicError(error) }, { status: 500 });
  }
  if (parsedQuery.data.export === "csv") {
    return new Response(workflowsToCsv(result, resource, parsedQuery.data), {
      headers: {
        "content-disposition": `attachment; filename="${resource}.csv"`,
        "content-type": "text/csv; charset=utf-8"
      }
    });
  }

  return NextResponse.json(result);
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { resource } = await context.params;
  if (!isWorkflowResource(resource)) {
    return NextResponse.json({ error: "Unknown workflow resource" }, { status: 404 });
  }

  try {
    assertWorkflowCreate(session, resource);
  } catch {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const parsedBody = workflowSchemas[resource].safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: formatValidationError(parsedBody.error) }, { status: 400 });
  }

  try {
    const row = await createWorkflowData(toTenantContext(session), resource, parsedBody.data);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: databaseUnavailableMessage }, { status: 503 });
    }
    return NextResponse.json({ error: getPublicError(error) }, { status: 400 });
  }
}

function formatValidationError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`).join("; ");
}

function getPublicError(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to save workflow data";
}
