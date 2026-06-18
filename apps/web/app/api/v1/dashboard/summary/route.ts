import { NextResponse } from "next/server";
import { getDashboardSummary } from "@crushermitra/database";
import { assertPermission } from "@crushermitra/permissions";
import { getCurrentSession } from "../../../../../lib/session";
import { toTenantContext } from "../../workflows/permissions";
import {
  databaseUnavailableMessage,
  isDatabaseUnavailable
} from "../../../../../lib/database-errors";

export async function GET() {
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

  let summary;
  try {
    summary = await getDashboardSummary(toTenantContext(session));
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return NextResponse.json({ error: databaseUnavailableMessage }, { status: 503 });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load dashboard" }, { status: 500 });
  }
  return NextResponse.json(summary);
}
