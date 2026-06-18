import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { getAdminReportsData } from "../../../lib/admin-data";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");
  const { data, error } = await getAdminReportsData();

  return (
    <AdminShell title="Reports">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        {error ? <div className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div> : null}
        <div className="grid gap-4 md:grid-cols-4">
          <Metric label="Organisations" value={String(data.metrics.organisations)} />
          <Metric label="Users" value={String(data.metrics.users)} />
          <Metric label="Payments" value={String(data.metrics.payments)} />
          <Metric label="Revenue" value={`Rs. ${data.metrics.revenue.toLocaleString("en-IN")}`} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Chart title="Plan subscriptions" values={groupBy(data.users, (row) => row.planCode)} />
          <Chart title="Payment status" values={groupBy(data.payments, (row) => row.status)} />
        </div>
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.users.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={4}>No PostgreSQL report data yet.</td></tr>
              ) : data.users.map((row) => (
                <tr className="border-t border-slate-200" key={row.userId}>
                  <td className="px-4 py-3">{row.companyName}</td>
                  <td className="px-4 py-3">{row.email}</td>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="border border-slate-200 bg-white p-5">
      <p className="text-sm font-semibold text-slate-600">{label}</p>
      <p className="mt-3 text-2xl font-black">{value}</p>
    </article>
  );
}

function Chart({ title, values }: { title: string; values: Array<{ label: string; value: number }> }) {
  const max = Math.max(...values.map((item) => item.value), 1);
  const colors = ["#0891b2", "#16a34a", "#f59e0b", "#7c3aed", "#dc2626"];
  return (
    <article className="border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 flex h-44 items-end gap-4 rounded-md bg-slate-50 p-4">
        {values.length === 0 ? (
          <div className="grid h-full w-full place-items-center text-sm text-slate-500">No report data yet.</div>
        ) : values.map((item, index) => (
          <div className="grid flex-1 gap-2" key={item.label}>
            <span
              className="mx-auto w-10 rounded-t"
              style={{ backgroundColor: colors[index % colors.length], height: `${Math.max(10, (item.value / max) * 120)}px` }}
              title={`${item.label}: ${item.value}`}
            />
            <span className="truncate text-center text-xs font-semibold text-slate-600">{item.label}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function groupBy<T>(rows: T[], getLabel: (row: T) => string): Array<{ label: string; value: number }> {
  const groups = new Map<string, number>();
  for (const row of rows) {
    const label = getLabel(row) || "-";
    groups.set(label, (groups.get(label) ?? 0) + 1);
  }
  return Array.from(groups.entries()).map(([label, value]) => ({ label, value }));
}
