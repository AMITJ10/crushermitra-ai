import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";
import { AdminPaymentsLocalData } from "../admin-local-data-client";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell title="Payments">
      <section className="mx-auto max-w-7xl px-4 py-6">
        <AdminPaymentsLocalData />
      </section>
    </AdminShell>
  );
}
