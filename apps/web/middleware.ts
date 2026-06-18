import createMiddleware from "next-intl/middleware";
import { productionLocales } from "@crushermitra/i18n";

export default createMiddleware({
  locales: productionLocales,
  defaultLocale: "en"
});

export const config = {
  matcher: ["/", "/(en|hi|mr)/:path*"]
};
