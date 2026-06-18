import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { getAdminUsersData } from "../../../lib/admin-data";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");
  const { data, error } = await getAdminUsersData();

  return (
    <AdminShell title="Users">
      <section className="mx-auto max-w-7xl px-4 py-6">
        {error ? <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div> : null}
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={5}>No database users found.</td></tr>
              ) : data.map((row) => (
                <tr className="border-t border-slate-200" key={row.userId}>
                  <td className="px-4 py-3">{row.name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.companyName}</td>
                  <td className="px-4 py-3">{row.planCode}</td>
                  <td className="px-4 py-3">{row.subscriptionStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
