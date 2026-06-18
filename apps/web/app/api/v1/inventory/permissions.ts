import type { SessionTenantContext } from "@crushermitra/auth";
import { assertPermission } from "@crushermitra/permissions";
import type { TenantContext } from "@crushermitra/database";

export function assertInventoryRead(session: SessionTenantContext): void {
  assertPermission(session, "inventory.view", { organisationId: session.organisationId });
}

export function assertInventoryAdjust(session: SessionTenantContext): void {
  assertPermission(session, "inventory.adjust", { organisationId: session.organisationId });
}

export function assertProductionRecord(session: SessionTenantContext): void {
  assertPermission(session, "production.record", { organisationId: session.organisationId });
}

export function assertDispatchComplete(session: SessionTenantContext): void {
  assertPermission(session, "dispatch.complete", { organisationId: session.organisationId });
}

export function toTenantContext(session: SessionTenantContext): TenantContext {
  return {
    organisationId: session.organisationId,
    userId: session.userId,
    allowedPlantIds: session.allowedPlantIds,
    activePlantId: session.activePlantId
  };
}
