export interface TenantContext {
  organisationId: string;
  userId: string;
  allowedPlantIds: string[];
  activePlantId?: string;
}

export interface AuditEventDraft {
  organisationId: string;
  plantId?: string;
  actorUserId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  reason?: string;
  requestId: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

export interface TenantOwnedResource {
  organisationId: string;
  plantId?: string;
}

export interface AuditLogRecord extends AuditEventDraft {
  createdAt: Date;
}

export function createTenantScopedWhere(context: TenantContext): {
  organisationId: string;
  plantId: { in: string[] };
} {
  return {
    organisationId: context.organisationId,
    plantId: {
      in: context.allowedPlantIds
    }
  };
}

export function assertTenantScopedAccess(
  context: TenantContext,
  resource: TenantOwnedResource
): void {
  if (context.organisationId !== resource.organisationId) {
    throw new Error("Tenant isolation violation: organisation mismatch.");
  }

  if (resource.plantId && !context.allowedPlantIds.includes(resource.plantId)) {
    throw new Error("Tenant isolation violation: plant access denied.");
  }
}

export function canAccessTenantResource(
  context: TenantContext,
  resource: TenantOwnedResource
): boolean {
  try {
    assertTenantScopedAccess(context, resource);
    return true;
  } catch {
    return false;
  }
}

export function createAuditLogRecord(event: AuditEventDraft): AuditLogRecord {
  if (!event.eventType || !event.entityType || !event.entityId || !event.requestId) {
    throw new Error("Audit event is missing required metadata.");
  }

  return {
    ...event,
    createdAt: new Date()
  };
}

export function createRlsSessionSettings(context: TenantContext): string[] {
  const settings: Array<[string, string]> = [
    ["app.current_organisation_id", context.organisationId],
    ["app.current_user_id", context.userId],
    ["app.allowed_plant_ids", context.allowedPlantIds.join(",")]
  ];

  if (context.activePlantId) {
    settings.push(["app.current_plant_id", context.activePlantId]);
  }

  return settings.map(
    ([key, value]) => `select set_config('${escapeSqlLiteral(key)}', '${escapeSqlLiteral(value)}', true);`
  );
}

export function createRequestId(prefix = "req"): string {
  const randomPart = Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}_${randomPart}`;
}

function escapeSqlLiteral(value: string): string {
  return value.replaceAll("'", "''");
}

export * from "./master-data";
export * from "./workflows";
export * from "./inventory-ledger";
