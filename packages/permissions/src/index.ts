export type Permission =
  | "organisation.manage"
  | "master_data.view"
  | "plant.create"
  | "plant.update"
  | "user.invite"
  | "customer.create"
  | "customer.update"
  | "supplier.create"
  | "supplier.update"
  | "product.create"
  | "product.update"
  | "vehicle.create"
  | "vehicle.update"
  | "driver.create"
  | "driver.update"
  | "machine.create"
  | "machine.update"
  | "storage_location.create"
  | "storage_location.update"
  | "storage_location.deactivate"
  | "shift.view"
  | "shift.manage"
  | "master_data.export"
  | "pricing.view"
  | "pricing.change"
  | "order.create"
  | "order.approve"
  | "weighment.create"
  | "weighment.correct"
  | "weighment.approve"
  | "dispatch.create"
  | "dispatch.complete"
  | "inventory.view"
  | "inventory.adjust"
  | "production.record"
  | "production.approve"
  | "invoice.create"
  | "payment.record"
  | "payment.approve"
  | "quality.create"
  | "quality.approve"
  | "maintenance.create"
  | "maintenance.close"
  | "compliance.view"
  | "compliance.manage"
  | "report.export"
  | "ai.use"
  | "audit.view";

export const allPermissions: Permission[] = [
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
];

export interface RoleTemplate {
  code: string;
  name: string;
  permissions: Permission[];
}

export const defaultRoleTemplates: RoleTemplate[] = [
  {
    code: "organisation_owner",
    name: "Organisation Owner",
    permissions: allPermissions
  },
  {
    code: "plant_manager",
    name: "Plant Manager",
    permissions: [
      "plant.update",
      "master_data.view",
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
      "order.create",
      "order.approve",
      "weighment.create",
      "weighment.approve",
      "dispatch.create",
      "dispatch.complete",
      "inventory.view",
      "production.record",
      "production.approve",
      "quality.create",
      "maintenance.create",
      "compliance.view",
      "report.export",
      "ai.use",
      "audit.view"
    ]
  },
  {
    code: "weighbridge_operator",
    name: "Weighbridge Operator",
    permissions: ["weighment.create", "dispatch.create", "inventory.view"]
  },
  {
    code: "accountant",
    name: "Accountant",
    permissions: [
      "pricing.view",
      "invoice.create",
      "payment.record",
      "payment.approve",
      "report.export",
      "audit.view"
    ]
  },
  {
    code: "read_only_auditor",
    name: "Read-Only Auditor",
    permissions: [
      "master_data.view",
      "inventory.view",
      "pricing.view",
      "compliance.view",
      "report.export",
      "audit.view"
    ]
  }
];

export interface PermissionContext {
  userId: string;
  organisationId: string;
  activePlantId?: string;
  allowedPlantIds: string[];
  permissions: Permission[];
}

export interface ResourceScope {
  organisationId: string;
  plantId?: string;
}

export function canAccessResource(
  context: PermissionContext,
  requiredPermission: Permission,
  resource: ResourceScope
): boolean {
  if (context.organisationId !== resource.organisationId) {
    return false;
  }

  if (!context.permissions.includes(requiredPermission)) {
    return false;
  }

  if (resource.plantId && !context.allowedPlantIds.includes(resource.plantId)) {
    return false;
  }

  return true;
}

export function assertPermission(
  context: PermissionContext,
  requiredPermission: Permission,
  resource: ResourceScope
): void {
  if (!canAccessResource(context, requiredPermission, resource)) {
    throw new Error(`Permission denied: ${requiredPermission}`);
  }
}

export function getRoleTemplate(code: string): RoleTemplate | undefined {
  return defaultRoleTemplates.find((role) => role.code === code);
}
