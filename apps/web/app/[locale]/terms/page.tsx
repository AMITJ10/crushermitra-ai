import { CrusherMitraLogo } from "../../../components/crushermitra-logo";

export default async function TermsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-3xl gap-5 border border-slate-200 bg-white p-6">
        <CrusherMitraLogo />
        <h1 className="text-3xl font-black">Terms</h1>
        <p className="leading-7 text-slate-700">Use of this system is governed by your organisation agreement, configured permissions and applicable law.</p>
        <a className="font-bold text-cyan-800" href={`/${locale}/login`}>Back to login</a>
      </section>
    </main>
  );
}
