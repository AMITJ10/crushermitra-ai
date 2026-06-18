import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";
import { AdminReportsLocalData } from "../admin-local-data-client";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell title="Reports">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <AdminReportsLocalData />
      </section>
    </AdminShell>
  );
}
