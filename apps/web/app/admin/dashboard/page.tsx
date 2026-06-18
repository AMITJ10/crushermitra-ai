import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { getAdminDashboardData } from "../../../lib/admin-data";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getCurrentAdminSession();
  if (!session) {
    redirect("/admin/login");
  }
  const { data, error } = await getAdminDashboardData();

  return (
    <AdminShell title="Admin Dashboard">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6">
        {error ? <ErrorBanner message={error} /> : null}
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-600">Signed in as</p>
          <h2 className="mt-1 text-xl font-black">{session.email}</h2>
          <p className="mt-1 text-sm text-slate-600">{session.role}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          <Metric label="Organisations" value={String(data.metrics.organisations)} />
          <Metric label="Users" value={String(data.metrics.users)} />
          <Metric label="Subscriptions" value={String(data.metrics.activeSubscriptions)} />
          <Metric label="Payments" value={String(data.metrics.payments)} />
          <Metric label="Revenue" value={`Rs. ${data.metrics.revenue.toLocaleString("en-IN")}`} />
        </div>
        <div className="overflow-x-auto border border-slate-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-100 text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Organisation</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.audits.length === 0 ? (
                <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={5}>No audit activity yet.</td></tr>
              ) : data.audits.map((row) => (
                <tr className="border-t border-slate-200" key={`${row.eventType}-${row.createdAt}`}>
                  <td className="px-4 py-3">{row.eventType}</td>
                  <td className="px-4 py-3">{row.organisationName}</td>
                  <td className="px-4 py-3">{row.entityType}</td>
                  <td className="px-4 py-3">{row.reason}</td>
                  <td className="px-4 py-3">{new Date(row.createdAt).toLocaleString("en-IN")}</td>
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

function ErrorBanner({ message }: { message: string }) {
  return <div className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{message}</div>;
}
