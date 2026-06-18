import { redirect } from "next/navigation";
import { getCurrentSession } from "../../../lib/session";
import { planDefinitions } from "../../../lib/plans";
import { AppShell } from "../app-shell";

export const dynamic = "force-dynamic";

export default async function PlansPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getCurrentSession();

  if (!session) {
    redirect(`/${locale}/login`);
  }

  return (
    <AppShell locale={locale} title="Plans" subtitle="Compare limits and choose the plan that matches your monthly workflow volume.">
      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 pb-24 md:grid-cols-3 lg:pb-8">
        {planDefinitions.map((plan) => (
          <article className="border border-slate-200 bg-white p-5" key={plan.code}>
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-3 text-2xl font-bold text-cyan-800">{plan.priceLabel}</p>
            <p className="mt-3 text-sm text-slate-600">
              Orders: {plan.orderLimit ?? "Unlimited"} / Dispatch: {plan.dispatchLimit ?? "Unlimited"} / Users: {plan.userLimit ?? "Configured"}
            </p>
            <ul className="mt-4 grid gap-2 text-sm text-slate-700">
              {plan.features.map((feature) => (
                <li className="rounded-md bg-slate-50 px-3 py-2" key={feature}>
                  {feature}
                </li>
              ))}
            </ul>
            <button className="mt-5 min-h-11 w-full rounded-md bg-slate-950 px-4 text-sm font-bold text-white" type="button">
              Choose Plan
            </button>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
