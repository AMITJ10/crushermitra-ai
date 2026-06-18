export const databaseUnavailableMessage =
  "Database unavailable. Start PostgreSQL, run migrations and seed data before using this endpoint.";

export function isDatabaseUnavailable(error: unknown): boolean {
  const texts = collectErrorTexts(error).join(" ");
  const code = getErrorCode(error);

  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    texts.includes("ECONNREFUSED") ||
    texts.includes("ENOTFOUND") ||
    texts.includes("ETIMEDOUT") ||
    texts.includes("Connection terminated") ||
    texts.includes("connect ECONNREFUSED")
  );
}

function collectErrorTexts(error: unknown): string[] {
  if (error instanceof AggregateError) {
    return [
      error.name,
      error.message,
      ...error.errors.flatMap((nestedError) => collectErrorTexts(nestedError))
    ];
  }

  if (error instanceof Error) {
    return [error.name, error.message, error.stack ?? ""];
  }

  return [String(error)];
}

function getErrorCode(error: unknown): string {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return "";
  }

  return String((error as { code?: unknown }).code ?? "");
}
