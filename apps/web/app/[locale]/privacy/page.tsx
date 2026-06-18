import { CrusherMitraLogo } from "../../../components/crushermitra-logo";

export default async function PrivacyPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-3xl gap-5 border border-slate-200 bg-white p-6">
        <CrusherMitraLogo />
        <h1 className="text-3xl font-black">Privacy</h1>
        <p className="leading-7 text-slate-700">Tenant data is scoped by authenticated organisation and plant context. Admin access is separated from tenant user sessions. Contact and lead forms collect only basic business contact details needed for follow-up.</p>
        <a className="font-bold text-cyan-800" href={`/${locale}/login`}>Back to login</a>
      </section>
    </main>
  );
}
