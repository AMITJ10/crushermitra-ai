import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";
import { AdminLeadsClient } from "./admin-leads-client";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell title="Leads">
      <AdminLeadsClient />
    </AdminShell>
  );
}
