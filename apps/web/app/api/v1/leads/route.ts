import { NextResponse } from "next/server";
import { getCurrentAdminSession } from "../../../../lib/admin-session";
import { createLead, listLeads } from "../../../../lib/leads-store";
import { notifyAdminNewLead } from "../../../../lib/notifications";

export async function GET(): Promise<NextResponse> {
  const admin = await getCurrentAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json({ rows: listLeads() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData();
  const lead = createLead({
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    company: String(form.get("company") ?? ""),
    message: String(form.get("message") ?? ""),
    selectedPlanInterest: String(form.get("selectedPlanInterest") ?? ""),
    pageVisited: String(form.get("pageVisited") ?? "/contact"),
    referrer: request.headers.get("referer") ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  });

  await notifyAdminNewLead({
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    selectedPlan: lead.selectedPlanInterest
  });

  return NextResponse.json({ lead, message: "Thank you. Our team will contact you soon." }, { status: 201 });
}
