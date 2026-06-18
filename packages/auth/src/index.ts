import type { PermissionContext } from "@crushermitra/permissions";
import { createHash, pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export const supportedSessionLocales = ["en", "hi", "mr", "gu", "kn", "te", "ta"] as const;
export type SessionLocale = (typeof supportedSessionLocales)[number];

export interface SessionTenantContext extends PermissionContext {
  membershipId: string;
  locale: SessionLocale;
  userName: string;
  userEmail: string;
  organisationName: string;
  activePlantName?: string;
  sessionId: string;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  disabledAt?: Date | null;
}

export interface LoginAuditEvent {
  eventType: "login" | "failed_login";
  userId?: string;
  email: string;
  reason?: string;
}

const passwordHashAlgorithm = "pbkdf2_sha256";
const defaultPasswordIterations = 310_000;
const passwordKeyLength = 32;
const passwordDigest = "sha256";

export function getDemoSessionContext(overrides: Partial<SessionTenantContext> = {}): SessionTenantContext {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    membershipId: "22222222-2222-4222-8222-222222222222",
    organisationId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    activePlantId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
    allowedPlantIds: [
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb3"
    ],
    locale: "en",
    userName: "Owner",
    userEmail: "local-owner@crushermitra.local",
    organisationName: "Local organisation",
    activePlantName: "Selected plant",
    sessionId: "demo-session-phase-1",
    permissions: [
      "organisation.manage",
      "master_data.view",
      "plant.create",
      "plant.update",
      "user.invite",
      "customer.create",
      "customer.update",
      "supplier.create",
      "supplier.update",
      "product.create",
      "product.update",
      "vehicle.create",
      "vehicle.update",
      "driver.create",
      "driver.update",
      "machine.create",
      "machine.update",
      "storage_location.create",
      "storage_location.update",
      "storage_location.deactivate",
      "shift.view",
      "shift.manage",
      "master_data.export",
      "pricing.view",
      "pricing.change",
      "order.create",
      "order.approve",
      "weighment.create",
      "weighment.correct",
      "weighment.approve",
      "dispatch.create",
      "dispatch.complete",
      "inventory.view",
      "inventory.adjust",
      "production.record",
      "production.approve",
      "invoice.create",
      "payment.record",
      "payment.approve",
      "quality.create",
      "quality.approve",
      "maintenance.create",
      "maintenance.close",
      "compliance.view",
      "compliance.manage",
      "report.export",
      "ai.use",
      "audit.view"
    ],
    ...overrides
  };
}

export function createPasswordHash(password: string, salt = createPasswordSalt()): string {
  assertUsablePassword(password);

  const hash = pbkdf2Sync(
    password,
    salt,
    defaultPasswordIterations,
    passwordKeyLength,
    passwordDigest
  ).toString("base64url");

  return `${passwordHashAlgorithm}$${defaultPasswordIterations}$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parsed = parsePasswordHash(storedHash);
  if (!parsed) {
    return false;
  }

  const candidate = pbkdf2Sync(
    password,
    parsed.salt,
    parsed.iterations,
    passwordKeyLength,
    passwordDigest
  );
  const expected = Buffer.from(parsed.hash, "base64url");

  return expected.length === candidate.length && timingSafeEqual(expected, candidate);
}

export function authenticateDemoUser(email: string, password: string): {
  context?: SessionTenantContext;
  auditEvent: LoginAuditEvent;
} {
  const normalisedEmail = normaliseEmail(email);
  const demoHash =
    "pbkdf2_sha256$310000$demo_phase1_owner_salt_2026$RAQ7dQm2GKzlLKjQfb276f4Gs9YvlPnqg1XqyEu46z8";

  const demoUser = demoUsers[normalisedEmail];
  if (!demoUser) {
    return {
      auditEvent: {
        eventType: "failed_login",
        email: normalisedEmail,
        reason: "unknown_email"
      }
    };
  }

  if (!verifyPassword(password, demoHash)) {
    return {
      auditEvent: {
        eventType: "failed_login",
        email: normalisedEmail,
        userId: demoUser.context.userId,
        reason: "invalid_password"
      }
    };
  }

  return {
    context: demoUser.context,
    auditEvent: {
      eventType: "login",
      email: normalisedEmail,
      userId: demoUser.context.userId
    }
  };
}

const ownerContext = getDemoSessionContext({
  userEmail: "owner@shivneri.example",
  userName: "Demo Owner"
});

const adjusterContext = getDemoSessionContext({
  userId: "11111111-1111-4111-8111-111111111112",
  membershipId: "22222222-2222-4222-8222-222222222223",
  userEmail: "inventory-adjuster@shivneri.example",
  userName: "Inventory Adjuster",
  sessionId: "demo-session-inventory-adjuster",
  permissions: ["master_data.view", "inventory.view", "inventory.adjust", "report.export", "audit.view"]
});

const viewerContext = getDemoSessionContext({
  userId: "11111111-1111-4111-8111-111111111113",
  membershipId: "22222222-2222-4222-8222-222222222224",
  userEmail: "inventory-viewer@shivneri.example",
  userName: "Inventory Viewer",
  sessionId: "demo-session-inventory-viewer",
  permissions: ["master_data.view", "inventory.view", "report.export", "audit.view"]
});

const demoUsers: Record<string, { context: SessionTenantContext }> = {
  "owner@shivneri.example": { context: ownerContext },
  "inventory-adjuster@shivneri.example": { context: adjusterContext },
  "inventory-viewer@shivneri.example": { context: viewerContext }
};

export function createSessionToken(context: SessionTenantContext, secret: string): string {
  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters.");
  }

  const payload = Buffer.from(JSON.stringify(context), "utf8").toString("base64url");
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token: string, secret: string): SessionTenantContext | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || signPayload(payload, secret) !== signature) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
    return parseSessionTenantContext(parsed);
  } catch {
    return null;
  }
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

function parsePasswordHash(storedHash: string):
  | {
      iterations: number;
      salt: string;
      hash: string;
    }
  | undefined {
  const [algorithm, iterationsRaw, salt, hash] = storedHash.split("$");
  const iterations = Number(iterationsRaw);

  if (
    algorithm !== passwordHashAlgorithm ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    !salt ||
    !hash
  ) {
    return undefined;
  }

  return { iterations, salt, hash };
}

function parseSessionTenantContext(value: unknown): SessionTenantContext | null {
  if (!isRecord(value)) {
    return null;
  }

  const requiredStrings = [
    "userId",
    "membershipId",
    "organisationId",
    "locale",
    "userName",
    "userEmail",
    "organisationName",
    "sessionId"
  ];

  if (!requiredStrings.every((key) => typeof value[key] === "string")) {
    return null;
  }

  if (!supportedSessionLocales.includes(value.locale as SessionLocale)) {
    return null;
  }

  if (!Array.isArray(value.allowedPlantIds) || !Array.isArray(value.permissions)) {
    return null;
  }

  return value as unknown as SessionTenantContext;
}

function signPayload(payload: string, secret: string): string {
  return createHash("sha256").update(`${payload}.${secret}`).digest("base64url");
}

function createPasswordSalt(): string {
  return randomBytes(24).toString("base64url");
}

function assertUsablePassword(password: string): void {
  if (password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
