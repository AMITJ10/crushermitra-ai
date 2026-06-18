import { describe, expect, it } from "vitest";
import { forgotPasswordSchema, resetPasswordSchema, signupSchema } from "./index";

describe("auth validation", () => {
  it("accepts a complete signup payload", () => {
    const parsed = signupSchema.safeParse({
      businessType: "stone_crusher",
      confirmPassword: "Roy@lgt650",
      defaultPlantName: "Main Crusher Plant",
      district: "Pune",
      email: "Owner@Example.com",
      fullName: "Amit Jadhav",
      locale: "en",
      mobile: "9876543210",
      organisationName: "Shivneri Stone Crusher",
      password: "Roy@lgt650",
      pincode: "411001",
      state: "Maharashtra",
      termsAccepted: true
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects password mismatch and missing terms acceptance", () => {
    const parsed = signupSchema.safeParse({
      businessType: "stone_crusher",
      confirmPassword: "different",
      district: "Pune",
      email: "owner@example.com",
      fullName: "Amit Jadhav",
      mobile: "9876543210",
      organisationName: "Shivneri Stone Crusher",
      password: "Roy@lgt650",
      pincode: "411001",
      state: "Maharashtra",
      termsAccepted: false
    });

    expect(parsed.success).toBe(false);
  });

  it("keeps forgot password response input generic and validates reset confirmation", () => {
    expect(forgotPasswordSchema.safeParse({ email: "user@example.com", locale: "en" }).success).toBe(true);
    expect(
      resetPasswordSchema.safeParse({
        confirmPassword: "Roy@lgt650",
        locale: "en",
        password: "Roy@lgt650",
        token: "abcdefghijklmnopqrstuvwxyz1234567890"
      }).success
    ).toBe(true);
  });
});
