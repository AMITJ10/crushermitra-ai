import { getTranslations } from "next-intl/server";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const { error } = await searchParams;
  const t = await getTranslations("auth");

  return (
    <main className="grid min-h-screen bg-slate-950 text-white lg:grid-cols-[0.95fr_1.05fr]">
      <section className="flex min-h-[34vh] flex-col justify-between bg-[linear-gradient(135deg,#0f172a,#134e4a)] px-6 py-8 lg:min-h-screen lg:px-10">
        <div>
          <p className="text-sm font-semibold uppercase text-cyan-100">CrusherMitra AI</p>
          <h1 className="mt-5 max-w-xl text-4xl font-bold leading-tight md:text-5xl">
            {t("headline")}
          </h1>
        </div>
        <div className="mt-8 grid gap-3 text-sm text-slate-100">
          <span>{t("tenantSafe")}</span>
          <span>{t("auditReady")}</span>
          <span>{t("localised")}</span>
        </div>
      </section>

      <section className="flex items-center justify-center bg-stone-50 px-4 py-8 text-slate-950">
        <form
          action="/api/v1/auth/login"
          method="post"
          className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
        >
          <input type="hidden" name="locale" value={locale} />
          <div>
            <h2 className="text-2xl font-bold">{t("signIn")}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{t("demoHint")}</p>
          </div>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {t("error")}
            </p>
          ) : null}

          <label className="mt-5 block text-sm font-semibold text-slate-700">
            {t("email")}
            <input
              className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            {t("password")}
            <input
              className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              required
            />
          </label>

          <button
            className="mt-6 min-h-12 w-full rounded-md bg-cyan-700 px-4 text-base font-bold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
            type="submit"
          >
            {t("continue")}
          </button>
        </form>
      </section>
    </main>
  );
}
