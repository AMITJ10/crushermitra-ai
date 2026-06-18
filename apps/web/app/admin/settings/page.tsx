import { redirect } from "next/navigation";
import { getCurrentAdminSession } from "../../../lib/admin-session";
import { AdminShell } from "../admin-shell";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const session = await getCurrentAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell title="Settings">
      <section className="mx-auto grid max-w-4xl gap-4 px-4 py-6">
        {["Billing provider", "WhatsApp provider", "SMS provider", "AI advisory approvals"].map((setting) => (
          <label className="grid gap-2 border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-700" key={setting}>
            {setting}
            <input className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" placeholder="Not configured" readOnly value="" />
          </label>
        ))}
      </section>
    </AdminShell>
  );
}
