import { cookies } from "next/headers";
import { createHash } from "node:crypto";

export const adminSessionCookieName = "crushermitra_admin_session";

export interface AdminSession {
  email: string;
  name: string;
  role: "Platform Admin";
  sessionId: string;
}

export async function getCurrentAdminSession(): Promise<AdminSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(adminSessionCookieName)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token, getAdminSecret());
}

export function createAdminSessionCookieValue(session: AdminSession): string {
  return createAdminSessionToken(session, getAdminSecret());
}

function createAdminSessionToken(session: AdminSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
  return `${payload}.${signPayload(payload, secret)}`;
}

function verifyAdminSessionToken(token: string, secret: string): AdminSession | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signPayload(payload, secret) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    if (!isAdminSession(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function signPayload(payload: string, secret: string): string {
  return createHash("sha256").update(`${payload}.${secret}`).digest("base64url");
}

function getAdminSecret(): string {
  const secret = process.env.ADMIN_AUTH_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_AUTH_SECRET, AUTH_SECRET or NEXTAUTH_SECRET must be set to at least 32 characters.");
  }

  return secret;
}

function isAdminSession(value: unknown): value is AdminSession {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.email === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.sessionId === "string" &&
    candidate.role === "Platform Admin"
  );
}
