import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import { productionLocales, type SupportedLocale } from "@crushermitra/i18n";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  if (!locale || !productionLocales.includes(locale as SupportedLocale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  };
});
