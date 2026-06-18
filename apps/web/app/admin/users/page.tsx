import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";
import { AdminUsersLocalData } from "../admin-local-data-client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell title="Users">
      <section className="mx-auto max-w-7xl px-4 py-6">
        <AdminUsersLocalData />
      </section>
    </AdminShell>
  );
}
