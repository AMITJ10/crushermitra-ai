import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";
import { AdminDashboardLocalData } from "../admin-local-data-client";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getCurrentAdminSession();
  if (!session) {
    redirect("/admin/login");
  }

  return (
    <AdminShell title="Admin Dashboard">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-600">Signed in as</p>
          <h2 className="mt-1 text-xl font-black">{session.email}</h2>
          <p className="mt-1 text-sm text-slate-600">{session.role}</p>
        </div>
      </section>
      <AdminDashboardLocalData />
    </AdminShell>
  );
}
