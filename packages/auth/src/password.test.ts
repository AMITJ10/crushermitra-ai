import { describe, expect, it } from "vitest";
import { createPasswordHash, normaliseEmail, verifyPassword } from "./index";

describe("password authentication", () => {
  it("hashes and verifies passwords without storing plaintext", () => {
    const hash = createPasswordHash("Roy@lgt650");

    expect(hash).not.toContain("Roy@lgt650");
    expect(verifyPassword("Roy@lgt650", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("normalises email addresses", () => {
    expect(normaliseEmail(" AmitJadhav7383@GMAIL.COM ")).toBe("amitjadhav7383@gmail.com");
  });
});
