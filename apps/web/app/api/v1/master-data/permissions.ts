import type { SessionTenantContext } from "@crushermitra/auth";
import { assertPermission, type Permission } from "@crushermitra/permissions";
import type { MasterDataResource, TenantContext } from "@crushermitra/database";

const createPermissions: Record<MasterDataResource, Permission> = {
  customers: "customer.create",
  customerSites: "customer.create",
  suppliers: "supplier.create",
  products: "product.create",
  productUnits: "product.update",
  productPrices: "pricing.change",
  vehicles: "vehicle.create",
  drivers: "driver.create",
  machines: "machine.create",
  storageLocations: "storage_location.create",
  shifts: "shift.manage"
};

const updatePermissions: Record<MasterDataResource, Permission> = {
  customers: "customer.update",
  customerSites: "customer.update",
  suppliers: "supplier.update",
  products: "product.update",
  productUnits: "product.update",
  productPrices: "pricing.change",
  vehicles: "vehicle.update",
  drivers: "driver.update",
  machines: "machine.update",
  storageLocations: "storage_location.update",
  shifts: "shift.manage"
};

export function assertMasterDataRead(session: SessionTenantContext): void {
  assertPermission(session, "master_data.view", { organisationId: session.organisationId });
}

export function assertMasterDataCreate(
  session: SessionTenantContext,
  resource: MasterDataResource
): void {
  assertPermission(session, createPermissions[resource], {
    organisationId: session.organisationId
  });
}

export function assertMasterDataUpdate(
  session: SessionTenantContext,
  resource: MasterDataResource
): void {
  assertPermission(session, updatePermissions[resource], {
    organisationId: session.organisationId
  });
}

export function assertMasterDataAudit(session: SessionTenantContext): void {
  assertPermission(session, "audit.view", { organisationId: session.organisationId });
}

export function assertMasterDataExport(session: SessionTenantContext): void {
  assertPermission(session, "master_data.export", { organisationId: session.organisationId });
}

export function toTenantContext(session: SessionTenantContext): TenantContext {
  return {
    organisationId: session.organisationId,
    userId: session.userId,
    allowedPlantIds: session.allowedPlantIds,
    activePlantId: session.activePlantId
  };
}
