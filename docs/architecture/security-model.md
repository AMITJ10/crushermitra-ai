# CrusherMitra AI Security Model

## 1. Security Objectives

The platform must protect tenant data, operational records, financial records, industrial workflows, user credentials, documents, device credentials, and AI tool access.

Security priorities:

- Tenant isolation.
- Strong authentication and session handling.
- Server-side authorization.
- Safe input validation.
- Immutable audit trails.
- Controlled correction workflows.
- Secure file access.
- Safe AI behavior.
- Secure integration and webhook handling.
- Resilience against offline sync replay and duplicate submission.

## Current Implementation Status

The repository currently contains security-oriented scaffolding: permission helper functions, validation schemas, `.env.example`, initial audit-log table design, selected RLS policies, AI service route shell, and Docker-based local services.

Production security is not complete yet. Phase 1 must wire real authentication, secure password hashing, session-derived organisation and plant context, server-side permission checks, complete RLS write policies, rate limiting, CSRF protections where applicable, secret redaction, and verification tests before the foundation can be considered accepted.

## 2. Authentication

Initial authentication requirements:

- Email and password.
- Secure password hashing.
- Password reset.
- Session management.
- Login history.
- Optional two-factor architecture.
- Mobile OTP-ready architecture.

Phase 1 should implement Auth.js or an equivalent secure authentication layer and keep provider-specific details isolated in `packages/auth`.

## 3. Session And Context Model

After login, users must select an organisation and plant where required.

Server session should include:

- User ID.
- Active organisation ID.
- Active plant ID, if selected.
- Membership ID.
- Role IDs.
- Permission snapshot or permission version.
- Allowed plant IDs.
- Session ID.

Organisation and plant context must be resolved from the session, not from client-provided request bodies.

## 4. Authorization Model

Authorization must be enforced at four layers:

1. UI: hide unavailable actions and show permission-aware empty states.
2. Server action/API layer: check permission before executing business logic.
3. Repository layer: scope every query to organisation and plant context.
4. Database layer: use RLS where practical.

Permission checks must be explicit for sensitive actions:

- Price changes.
- Rate overrides.
- Credit exceptions.
- Weighment correction.
- Stock adjustment.
- Payment approval.
- Invoice cancellation.
- Mix-design changes.
- Manual water or admixture additions.
- Licence updates.
- Document downloads.
- User impersonation.
- Data exports.

## 5. Tenant Isolation

Rules:

- Every tenant-owned table has `organisation_id`.
- Plant records have `plant_id` when applicable.
- All queries are scoped by authenticated context.
- Background jobs carry tenant context.
- AI tools carry tenant context.
- Search, reports, exports, and vector retrieval are tenant-scoped.
- Object storage keys include tenant-safe partitioning but access still depends on signed URLs and authorization checks.

Database RLS should use transaction-local settings for current organisation, user, and allowed plants.

## 6. Audit Model

`audit_logs` should be append-only and include:

- Organisation.
- Plant, when relevant.
- User.
- Actor type.
- Event type.
- Entity type.
- Entity ID.
- Previous value summary.
- New value summary.
- Reason.
- Request ID.
- IP and user agent where available.
- Timestamp.

Sensitive audit events:

- Login.
- Failed login.
- Role change.
- Price change.
- Weighment correction.
- Stock adjustment.
- Payment correction.
- Invoice cancellation.
- Mix-design change.
- Manual water addition.
- Licence update.
- Document download.
- User impersonation.
- Data export.
- AI tool call.
- Integration credential change.

## 7. Input Validation

Validation layers:

- Browser form validation for usability.
- Zod schemas in web code.
- Pydantic schemas in AI/FastAPI code.
- Database constraints for final integrity.

Indian localisation validation should include:

- Indian mobile numbers.
- GSTIN.
- PAN.
- CIN where applicable.
- Vehicle registration formats.
- Pincode.
- State and district master references.

Validation must not hardcode legal or compliance requirements as universal rules.

## 8. File And Document Security

Requirements:

- Store files in S3-compatible object storage.
- Use signed upload and download URLs.
- Check permission before issuing URLs.
- Validate file type and size.
- Add malware-scanning adapter.
- Store file hash and version metadata.
- Audit sensitive downloads.
- Never expose bucket credentials in client code.

Protected files include invoices, weighment images, number-plate images, material images, compliance documents, quality certificates, and customer/supplier documents.

## 9. API Security

APIs must implement:

- Authentication.
- Permission checks.
- Tenant checks.
- CSRF protection where applicable.
- Rate limiting.
- Request validation.
- Consistent error format.
- Request IDs.
- Idempotency for sensitive writes.
- Output encoding.
- Webhook signature validation.
- Safe database queries.
- Protection against mass assignment.

No endpoint should accept arbitrary table names, field names, SQL snippets, or unbounded export requests.

## 10. AI Safety And Data Security

AI must:

- Use explicit tool definitions.
- Scope tools by organisation and plant.
- Log all tool calls.
- Return source references for document answers.
- Label estimates and uncertainty.
- Create draft actions instead of direct sensitive writes.
- Require human approval for safety, quality, compliance, and commercial decisions.

AI must not:

- Execute arbitrary SQL.
- Read cross-tenant data.
- Start machinery.
- Directly alter mix designs.
- Directly approve compliance.
- Commit WhatsApp orders without configured approval.
- Invent missing operational or legal data.

## 11. Integration Security

Integration connections should:

- Store credentials encrypted.
- Support credential rotation.
- Validate webhook signatures.
- Use least-privilege provider tokens.
- Avoid logging secrets or full sensitive payloads.
- Record integration events and failures.
- Support per-organisation and per-plant enablement.

Device integrations should use device IDs, signed requests, replay protection, heartbeat tracking, and revocation.

## 12. Offline Sync Security

Offline writes must include:

- Client-generated ID.
- Idempotency key.
- User ID.
- Device ID where relevant.
- Timestamp.
- Tenant and plant context from the authenticated sync session.
- Payload hash.

Server must:

- Validate permissions at sync time.
- Reject duplicate keys safely.
- Detect conflicts with approved or corrected records.
- Store conflict records.
- Avoid silent overwrites.

## 13. Threat Assessment

| Threat | Risk | Mitigation |
| --- | --- | --- |
| Cross-tenant data leak | Critical | Session-derived tenant context, scoped repositories, RLS, tests |
| Broken permission checks | Critical | Central policy helpers, server enforcement, audit logs |
| Weighment fraud | High | Device signing, images, anomaly flags, corrections, print tracking |
| Stock manipulation | High | Immutable stock ledger, approvals, audit, transactions |
| Invoice/payment tampering | High | Controlled status transitions, correction logs, audit |
| AI unsafe action | High | Tool allowlist, draft-only writes, approvals, logs |
| Offline replay or duplicate write | High | Idempotency keys, sequence numbers, payload hashes |
| Stolen device credential | High | Credential revocation, rotation, signed requests, heartbeat |
| Compliance misstatement | High | Configurable templates, disclaimers, human approval |
| File data exposure | High | Signed URLs, permission checks, audit, scanning |
| Credential leakage | High | Environment variables, secret manager, redacted logs |
| Mass assignment | Medium | DTO schemas, explicit field mapping |
| Denial of service | Medium | Rate limiting, queue isolation, payload limits |
| Bad sensor assumptions | Medium | Calibration metadata, source labeling, no official compliance claim |

## 14. Security Requirements For Definition Of Done

A feature is not complete unless:

- Inputs are validated.
- Permissions are enforced server-side.
- Tenant scoping is tested.
- Sensitive actions create audit logs.
- Files use signed URLs where relevant.
- Idempotency is implemented for sensitive writes.
- Corrections preserve original values.
- Tests pass.
- No secrets are committed.
