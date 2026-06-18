import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "../../../../../lib/admin-session";
import { deleteLead, updateLead } from "../../../../../lib/leads-store";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  const body = (await request.json()) as { notes?: string; status?: string };
  const lead = updateLead(id, {
    notes: body.notes,
    status: body.status as never
  });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  return NextResponse.json({ lead });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const admin = await getCurrentAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  const { id } = await params;
  return NextResponse.json({ deleted: deleteLead(id) });
}
