import type { SessionTenantContext } from "@crushermitra/auth";
import { assertPermission, type Permission } from "@crushermitra/permissions";
import type { TenantContext, WorkflowResource } from "@crushermitra/database";

const readPermissions: Record<WorkflowResource, Permission> = {
  orders: "order.create",
  dispatches: "dispatch.create",
  operations: "production.record",
  billing: "invoice.create"
};

const createPermissions: Record<WorkflowResource, Permission> = {
  orders: "order.create",
  dispatches: "dispatch.create",
  operations: "production.record",
  billing: "invoice.create"
};

const updatePermissions: Record<WorkflowResource, Permission> = {
  orders: "order.approve",
  dispatches: "dispatch.complete",
  operations: "production.approve",
  billing: "payment.approve"
};

export function isWorkflowResource(value: string): value is WorkflowResource {
  return value === "orders" || value === "dispatches" || value === "operations" || value === "billing";
}

export function assertWorkflowRead(session: SessionTenantContext, resource: WorkflowResource): void {
  assertPermission(session, readPermissions[resource], {
    organisationId: session.organisationId,
    plantId: session.activePlantId
  });
}

export function assertWorkflowCreate(session: SessionTenantContext, resource: WorkflowResource): void {
  assertPermission(session, createPermissions[resource], {
    organisationId: session.organisationId,
    plantId: session.activePlantId
  });
}

export function assertWorkflowUpdate(session: SessionTenantContext, resource: WorkflowResource): void {
  assertPermission(session, updatePermissions[resource], {
    organisationId: session.organisationId,
    plantId: session.activePlantId
  });
}

export function toTenantContext(session: SessionTenantContext): TenantContext {
  return {
    organisationId: session.organisationId,
    userId: session.userId,
    allowedPlantIds: session.allowedPlantIds,
    activePlantId: session.activePlantId
  };
}
