import { describe, expect, it } from "vitest";
import { createSessionToken, getDemoSessionContext } from "@crushermitra/auth";
import { resolveSessionFromToken } from "./session";

const secret = "12345678901234567890123456789012";

describe("web session resolution", () => {
  it("does not create a demo session when the request has no cookie token", () => {
    process.env.AUTH_SECRET = secret;

    expect(resolveSessionFromToken()).toBeNull();
  });

  it("does not create a demo session for an invalid token", () => {
    process.env.AUTH_SECRET = secret;

    expect(resolveSessionFromToken("invalid-token")).toBeNull();
  });

  it("resolves only a signed session token", () => {
    process.env.AUTH_SECRET = secret;
    const token = createSessionToken(getDemoSessionContext(), secret);

    expect(resolveSessionFromToken(token)?.organisationId).toBe(getDemoSessionContext().organisationId);
  });
});
