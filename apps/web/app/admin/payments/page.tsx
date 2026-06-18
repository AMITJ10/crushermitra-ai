import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { getAdminPaymentsData } from "../../../lib/admin-data";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");
  const { data, error } = await getAdminPaymentsData();

  return (
    <AdminShell title="Payments">
      <section className="mx-auto max-w-7xl px-4 py-6">
        {error ? <div className="mb-4 border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div> : null}
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={7}>No PostgreSQL payment records yet.</td></tr>
              ) : data.map((row) => (
                <tr className="border-t border-slate-200" key={`${row.userEmail}-${row.date}-${row.amount}`}>
                  <td className="px-4 py-3">{row.userEmail}</td>
                  <td className="px-4 py-3">{row.companyName}</td>
                  <td className="px-4 py-3">{row.planName}</td>
                  <td className="px-4 py-3">Rs. {row.amount.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3">{row.method}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{new Date(row.date).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminShell>
  );
}
