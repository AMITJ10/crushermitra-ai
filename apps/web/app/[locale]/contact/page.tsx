import { CrusherMitraLogo } from "../../../components/crushermitra-logo";
import { ContactForm } from "./contact-form";

export default async function ContactPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-slate-950">
      <section className="mx-auto grid max-w-3xl gap-5 border border-slate-200 bg-white p-6">
        <CrusherMitraLogo />
        <h1 className="text-3xl font-black">Contact</h1>
        <p className="leading-7 text-slate-700">Share basic contact details and our team will respond. We collect only the information needed to contact you.</p>
        <ContactForm />
        <a className="font-bold text-cyan-800" href={`/${locale}/login`}>Back to login</a>
      </section>
    </main>
  );
}
