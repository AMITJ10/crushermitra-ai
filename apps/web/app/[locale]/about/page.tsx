import { CrusherMitraLogo } from "../../../components/crushermitra-logo";

export default async function AboutPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return <StaticPage locale={locale} title="About" body="CrusherMitra AI is built for tenant-aware crusher, quarry, aggregate, transport and RMC operations." />;
}

function StaticPage({ body, locale, title }: { body: string; locale: string; title: string }) {
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-3xl gap-5 border border-slate-200 bg-white p-6">
        <CrusherMitraLogo />
        <h1 className="text-3xl font-black">{title}</h1>
        <p className="leading-7 text-slate-700">{body}</p>
        <a className="font-bold text-cyan-800" href={`/${locale}/login`}>
          Back to login
        </a>
      </section>
    </main>
  );
}
