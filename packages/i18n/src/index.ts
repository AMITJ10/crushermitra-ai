export const supportedLocales = ["en", "hi", "mr", "gu", "kn", "te", "ta"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export const productionLocales: SupportedLocale[] = ["en", "hi", "mr"];
export const preparedLocales: SupportedLocale[] = ["gu", "kn", "te", "ta"];

