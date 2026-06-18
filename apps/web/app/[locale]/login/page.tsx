import { getTranslations } from "next-intl/server";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; mode?: string; notice?: string }>;
}) {
  const { locale } = await params;
  const { error, mode, notice } = await searchParams;
  const t = await getTranslations("auth");
  const isSignup = mode === "signup";

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
        <div className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 p-1 text-sm font-bold">
            <a className={`rounded px-3 py-2 text-center ${isSignup ? "text-slate-700" : "bg-white text-cyan-800 shadow-sm"}`} href={`/${locale}/login`}>
              Sign In
            </a>
            <a className={`rounded px-3 py-2 text-center ${isSignup ? "bg-white text-cyan-800 shadow-sm" : "text-slate-700"}`} href={`/${locale}/login?mode=signup`}>
              Get Started
            </a>
          </div>

          {error ? (
            <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
              {error === "authentication_failed" ? t("error") : error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
              {notice}
            </p>
          ) : null}

          {isSignup ? (
            <form action="/api/v1/auth/signup" className="mt-5 grid gap-4" method="post">
              <input type="hidden" name="locale" value={locale} />
              <div>
                <h2 className="text-2xl font-bold">Create your organisation</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Start with an owner account and one plant. Platform admin access is never created from signup.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <TextField autoComplete="name" label="Full name" name="fullName" placeholder="Amit Jadhav" required />
                <TextField autoComplete="email" label="Email" name="email" placeholder="you@example.com" required type="email" />
                <TextField autoComplete="new-password" label="Password" name="password" placeholder="Minimum 8 characters" required type="password" />
                <TextField autoComplete="new-password" label="Confirm password" name="confirmPassword" placeholder="Re-enter password" required type="password" />
                <TextField autoComplete="tel" label="Mobile number" name="mobile" placeholder="9876543210" required />
                <TextField label="Organisation name" name="organisationName" placeholder="Shivneri Stone Crusher" required />
                <label className="block text-sm font-semibold text-slate-700">
                  Business type <span className="text-red-700">*</span>
                  <select className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100" name="businessType" required>
                    <option value="">Select business type</option>
                    <option value="stone_crusher">Stone Crusher</option>
                    <option value="rmc_plant">RMC Plant</option>
                    <option value="crusher_rmc">Crusher + RMC</option>
                    <option value="quarry">Quarry</option>
                    <option value="aggregate_supplier">Aggregate Supplier</option>
                    <option value="transporter">Transporter</option>
                  </select>
                </label>
                <TextField label="Default plant name" name="defaultPlantName" placeholder="Main Crusher Plant" />
                <TextField label="PAN" name="pan" placeholder="Optional" />
                <TextField label="State" name="state" placeholder="Maharashtra" required />
                <TextField label="District" name="district" placeholder="Pune" required />
                <TextField label="PIN code" name="pincode" placeholder="411001" required />
              </div>
              <label className="flex items-start gap-3 text-sm font-semibold text-slate-700">
                <input className="mt-1 size-4" name="termsAccepted" required type="checkbox" />
                <span>I accept the CrusherMitra AI terms and confirm I am authorised to create this organisation.</span>
              </label>
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <a className="grid min-h-12 place-items-center rounded-md border border-slate-300 px-4 text-base font-bold" href={`/${locale}/login`}>
                  Cancel
                </a>
                <button className="min-h-12 rounded-md bg-cyan-700 px-4 text-base font-bold text-white hover:bg-cyan-800" type="submit">
                  Save and continue
                </button>
              </div>
            </form>
          ) : (
            <form action="/api/v1/auth/login" className="mt-5" method="post">
              <input type="hidden" name="locale" value={locale} />
              <div>
                <h2 className="text-2xl font-bold">{t("signIn")}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("demoHint")}</p>
              </div>

              <TextField autoComplete="email" label={t("email")} name="email" placeholder="you@example.com" required type="email" />
              <TextField autoComplete="current-password" label={t("password")} name="password" placeholder="Enter your password" required type="password" />

              <div className="mt-3 text-right">
                <a className="text-sm font-semibold text-cyan-800 hover:text-cyan-900" href={`/${locale}/forgot-password`}>
                  Forgot password?
                </a>
              </div>
              <button
                className="mt-6 min-h-12 w-full rounded-md bg-cyan-700 px-4 text-base font-bold text-white hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-300"
                type="submit"
              >
                {t("continue")}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function TextField({
  autoComplete,
  label,
  name,
  placeholder,
  required = false,
  type = "text"
}: {
  autoComplete?: string;
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
  type?: "email" | "password" | "text";
}) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      {required ? <span className="text-red-700"> *</span> : null}
      <input
        autoComplete={autoComplete}
        className="mt-2 min-h-12 w-full rounded-md border border-slate-300 px-3 text-base outline-none focus:border-cyan-700 focus:ring-2 focus:ring-cyan-100"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}
