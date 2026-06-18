import { redirect } from "next/navigation";
import { CrusherMitraLogo } from "../../../components/crushermitra-logo";
import { getCurrentAdminSession } from "../../../lib/admin-session";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getCurrentAdminSession();
  const { error } = await searchParams;

  if (session) {
    redirect("/admin/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-8 text-slate-950">
      <form action="/api/v1/admin/auth/login" className="grid w-full max-w-md gap-4 border border-slate-200 bg-white p-6" method="post">
        <CrusherMitraLogo />
        <div>
          <h1 className="text-2xl font-black">Admin login</h1>
          <p className="mt-1 text-sm text-slate-600">Platform owner access for users, plans, payments, reports and settings.</p>
        </div>
        {error ? <div className="border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</div> : null}
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Email
          <input className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" name="email" placeholder="admin@example.com" required type="email" />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-slate-700">
          Password
          <input className="min-h-11 rounded-md border border-slate-300 px-3 text-sm" name="password" placeholder="Enter admin password" required type="password" />
        </label>
        <button className="min-h-11 rounded-md bg-slate-950 px-4 text-sm font-bold text-white" type="submit">
          Login
        </button>
      </form>
    </main>
  );
}
