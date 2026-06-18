import type { AuditEventDraft } from "@crushermitra/database";

const startupEvent: AuditEventDraft = {
  organisationId: "org_system",
  actorUserId: "system",
  eventType: "worker.started",
  entityType: "worker",
  entityId: "typescript-worker",
  requestId: "local-startup"
};

console.log(JSON.stringify({ service: "@crushermitra/worker", status: "ready", startupEvent }));

