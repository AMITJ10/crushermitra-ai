import { NextResponse } from "next/server";
import { z } from "zod";
import {
  deleteWorkflowData,
  updateWorkflowData
} from "@crushermitra/database";
import { uuidSchema, workflowSchemas } from "@crushermitra/validation";
import { getCurrentSession } from "../../../../../../lib/session";
import {
  databaseUnavailableMessage,
  isDatabaseUnavailable
} from "../../../../../../lib/database-errors";
import {
  assertWorkflowUpdate,
  isWorkflowResource,
  toTenantContext
} from "../../permissions";

interface RouteContext {
  params: Promise<{ resource: string; id: string }>;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { resource, id } = await context.params;
  if (!isWorkflowResource(resource) || !uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Unknown workflow resource" }, { status: 404 });
  }

  try {
    assertWorkflowUpdate(session, resource);
  } catch {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const schema = (workflowSchemas[resource] as z.ZodObject<z.ZodRawShape>).partial();
  const parsedBody = schema.safeParse(await request.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: formatValidationError(parsedBody.error) }, { status: 400 });
  }

  try {
    const row = await updateWorkflowData(toTenantContext(session), resource, id, parsedBody.data);
    return NextResponse.json(row);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: databaseUnavailableMessage }, { status: 503 });
    }
    return NextResponse.json({ error: getPublicError(error) }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getCurrentSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const { resource, id } = await context.params;
  if (!isWorkflowResource(resource) || !uuidSchema.safeParse(id).success) {
    return NextResponse.json({ error: "Unknown workflow resource" }, { status: 404 });
  }

  try {
    assertWorkflowUpdate(session, resource);
  } catch {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  try {
    const row = await deleteWorkflowData(toTenantContext(session), resource, id);
    return NextResponse.json(row);
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
