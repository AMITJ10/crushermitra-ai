import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";

const plans = [
  { name: "Starter", price: "Rs. 999/month", limits: "3 users, 500 orders/month, 500 dispatches/month" },
  { name: "Growth", price: "Rs. 2,999/month", limits: "15 users, 5,000 orders/month, 5,000 dispatches/month" },
  { name: "Enterprise", price: "Rs. 9,999/month", limits: "Configured users and high-volume workflows" }
];

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell title="Plans">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 md:grid-cols-3">
        {plans.map((plan) => (
          <article className="border border-slate-200 bg-white p-5" key={plan.name}>
            <h2 className="text-xl font-black">{plan.name}</h2>
            <p className="mt-2 text-2xl font-black text-cyan-800">{plan.price}</p>
            <p className="mt-3 text-sm leading-6 text-slate-700">{plan.limits}</p>
            <button className="mt-5 min-h-11 w-full rounded-md border border-slate-300 px-4 text-sm font-bold" type="button">
              Manage plan
            </button>
          </article>
        ))}
      </section>
    </AdminShell>
  );
}
