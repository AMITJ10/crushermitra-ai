export default async function ResetPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const { locale } = await params;
  const { error, token } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-8 text-slate-950">
      <form action="/api/v1/auth/reset-password" className="grid w-full max-w-md gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm" method="post">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="token" value={token ?? ""} />
        <div>
          <h1 className="text-2xl font-black">Choose a new password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Reset links expire after 45 minutes and can be used only once.</p>
        </div>
        {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">{error}</p> : null}
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          New password
          <input autoComplete="new-password" className="min-h-12 rounded-md border border-slate-300 px-3 text-base" name="password" placeholder="Minimum 8 characters" required type="password" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Confirm password
          <input autoComplete="new-password" className="min-h-12 rounded-md border border-slate-300 px-3 text-base" name="confirmPassword" placeholder="Re-enter new password" required type="password" />
        </label>
        <button className="min-h-12 rounded-md bg-cyan-700 px-4 text-base font-bold text-white" type="submit">
          Reset password
        </button>
      </form>
    </main>
  );
}
