import { cookies } from "next/headers";
import {
  createSessionToken,
  type SessionTenantContext,
  verifySessionToken
} from "@crushermitra/auth";

export const sessionCookieName = "crushermitra_session";

export async function getCurrentSession(): Promise<SessionTenantContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  return resolveSessionFromToken(token);
}

export function createSessionCookieValue(context: SessionTenantContext): string {
  return createSessionToken(context, getAuthSecret());
}

export function resolveSessionFromToken(token?: string): SessionTenantContext | null {
  if (!token) {
    return null;
  }

  return verifySessionToken(token, getAuthSecret());
}

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to at least 32 characters.");
  }

  return secret;
}
