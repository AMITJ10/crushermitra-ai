import { describe, expect, it } from "vitest";
import {
  authenticateDemoUser,
  createPasswordHash,
  createSessionToken,
  getDemoSessionContext,
  verifyPassword,
  verifySessionToken
} from "../src";

describe("authentication foundation", () => {
  it("hashes and verifies passwords without storing plain text", () => {
    const hash = createPasswordHash("ChangeMe!123", "unit_test_salt");

    expect(hash).not.toContain("ChangeMe!123");
    expect(verifyPassword("ChangeMe!123", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("authenticates the seeded demo owner", () => {
    const result = authenticateDemoUser("OWNER@SHIVNERI.EXAMPLE", "ChangeMe!123");

    expect(result.context?.organisationId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(result.auditEvent.eventType).toBe("login");
  });

  it("rejects invalid demo credentials", () => {
    const result = authenticateDemoUser("owner@shivneri.example", "wrong-password");

    expect(result.context).toBeUndefined();
    expect(result.auditEvent.eventType).toBe("failed_login");
  });

  it("signs and verifies tenant session context", () => {
    const secret = "12345678901234567890123456789012";
    const token = createSessionToken(getDemoSessionContext(), secret);

    expect(verifySessionToken(token, secret)?.userId).toBe(getDemoSessionContext().userId);
    expect(verifySessionToken(`${token}tampered`, secret)).toBeNull();
  });
});
