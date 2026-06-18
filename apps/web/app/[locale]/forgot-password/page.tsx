export default async function ForgotPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ sent?: string }>;
}) {
  const { locale } = await params;
  const { sent } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 px-4 py-8 text-slate-950">
      <form action="/api/v1/auth/forgot-password" className="grid w-full max-w-md gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm" method="post">
        <input type="hidden" name="locale" value={locale} />
        <div>
          <h1 className="text-2xl font-black">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Enter your account email. If it exists, a reset link will be sent.</p>
        </div>
        {sent ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
            If an account exists for that email, a reset link has been sent.
          </p>
        ) : null}
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          Email
          <input autoComplete="email" className="min-h-12 rounded-md border border-slate-300 px-3 text-base" name="email" placeholder="you@example.com" required type="email" />
        </label>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <a className="grid min-h-12 place-items-center rounded-md border border-slate-300 px-4 text-base font-bold" href={`/${locale}/login`}>
            Cancel
          </a>
          <button className="min-h-12 rounded-md bg-cyan-700 px-4 text-base font-bold text-white" type="submit">
            Send reset link
          </button>
        </div>
      </form>
    </main>
  );
}
