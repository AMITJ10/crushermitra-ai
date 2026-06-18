import { describe, expect, it } from "vitest";
import { allPermissions, canAccessResource, getRoleTemplate } from "../src";

const context = {
  userId: "user_demo_owner",
  organisationId: "org_shivneri",
  activePlantId: "plant_pune_crusher",
  allowedPlantIds: ["plant_pune_crusher"],
  permissions: ["inventory.view" as const, "master_data.view" as const]
};

describe("canAccessResource", () => {
  it("blocks cross-tenant access", () => {
    expect(
      canAccessResource(context, "inventory.view", {
        organisationId: "org_other",
        plantId: "plant_pune_crusher"
      })
    ).toBe(false);
  });

  it("allows same tenant and allowed plant", () => {
    expect(
      canAccessResource(context, "inventory.view", {
        organisationId: "org_shivneri",
        plantId: "plant_pune_crusher"
      })
    ).toBe(true);
  });

  it("blocks cross-tenant report export and AI access", () => {
    const reportContext = {
      ...context,
      permissions: ["report.export" as const, "ai.use" as const]
    };

    expect(
      canAccessResource(reportContext, "report.export", {
        organisationId: "org_other",
        plantId: "plant_pune_crusher"
      })
    ).toBe(false);
    expect(
      canAccessResource(reportContext, "ai.use", {
        organisationId: "org_other",
        plantId: "plant_pune_crusher"
      })
    ).toBe(false);
  });

  it("blocks same-tenant plants outside the session allow-list", () => {
    expect(
      canAccessResource(context, "inventory.view", {
        organisationId: "org_shivneri",
        plantId: "plant_other"
      })
    ).toBe(false);
  });

  it("blocks update-like actions when the permission is absent", () => {
    expect(
      canAccessResource(context, "inventory.adjust", {
        organisationId: "org_shivneri",
        plantId: "plant_pune_crusher"
      })
    ).toBe(false);
  });
});

describe("phase 2 master data permissions", () => {
  it("defines explicit read and write permissions", () => {
    expect(allPermissions).toContain("master_data.view");
    expect(allPermissions).toContain("supplier.create");
    expect(allPermissions).toContain("vehicle.update");
    expect(allPermissions).toContain("storage_location.update");
  });

  it("includes master data access in owner and plant manager roles", () => {
    expect(getRoleTemplate("organisation_owner")?.permissions).toContain("master_data.view");
    expect(getRoleTemplate("plant_manager")?.permissions).toContain("master_data.view");
    expect(getRoleTemplate("plant_manager")?.permissions).toContain("machine.create");
  });
});
