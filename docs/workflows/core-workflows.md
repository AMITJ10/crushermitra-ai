# CrusherMitra AI Core Workflows

## 1. Organisation Onboarding

```mermaid
flowchart TD
  A["Organisation details"] --> B["Business type"]
  B --> C["Plant setup"]
  C --> D["Products"]
  D --> E["Users and roles"]
  E --> F["Opening balances"]
  F --> G["Integration setup"]
  G --> H["Review and activate"]
```

Validation:

- PAN, GSTIN, mobile, pincode, and financial year are validated.
- Plant code and product code are unique within the organisation.
- Opening balances create stock and ledger entries through controlled workflows.
- Invitations create audit logs.

## 2. Crusher Production Workflow

```mermaid
flowchart TD
  A["Open shift"] --> B["Start production run"]
  B --> C["Record raw input"]
  C --> D["Record machine runtime and downtime"]
  D --> E["Record product outputs"]
  E --> F["Record electricity, diesel, water, loader hours"]
  F --> G["Calculate recovery, yield, cost, and variance"]
  G --> H{"Variance over configured limit?"}
  H -- "Yes" --> I["Require reason and approval"]
  H -- "No" --> J["Submit for approval"]
  I --> J
  J --> K["Approve run"]
  K --> L["Post stock ledger entries"]
```

Rules:

- Raw stock consumption and finished output creation happen through inventory transactions.
- Material-balance variance is displayed, not silently forced.
- Approved production runs are immutable except through correction workflows.
- Energy and diesel costs are calculated from configured cost sources.

## 3. RMC Production Workflow

```mermaid
flowchart TD
  A["Enquiry"] --> B["Quotation"]
  B --> C["Customer approval"]
  C --> D["Credit check"]
  D --> E["Order"]
  E --> F["Site schedule"]
  F --> G["Vehicle planning"]
  G --> H["Batch planning"]
  H --> I["Select approved mix-design revision"]
  I --> J["Produce batch"]
  J --> K["Record actual ingredients and deviations"]
  K --> L{"Sensitive override?"}
  L -- "Yes" --> M["Permission, reason, approval, audit"]
  L -- "No" --> N["Dispatch"]
  M --> N
  N --> O["Site delivery and acknowledgement"]
  O --> P["Invoice"]
  P --> Q["Payment"]
```

Rules:

- Approved mix designs are versioned and immutable.
- Every batch records selected mix-design revision.
- Manual water, admixture, mix-design, or quantity overrides require permission, reason, approver, timestamp, original value, and changed value.
- Batch ingredient consumption posts inventory transactions.

## 4. Quarry And Raw-Material Purchase Workflow

```mermaid
flowchart TD
  A["Draft purchase order"] --> B["Supplier approval"]
  B --> C["Vehicle arrival"]
  C --> D["First weighment"]
  D --> E["Material unloading"]
  E --> F["Quality inspection"]
  F --> G["Second weighment"]
  G --> H["Net quantity"]
  H --> I["Purchase receipt"]
  I --> J["Stock update"]
  J --> K["Supplier invoice"]
  K --> L["Payment"]
```

Controls:

- Duplicate royalty/transit pass alerts.
- Suspicious source alerts.
- Photos and documents stored securely.
- OCR or document extraction creates drafts that require approval.

## 5. Weighbridge Workflow

```mermaid
flowchart TD
  A["Vehicle arrives"] --> B["Select transaction type"]
  B --> C["Capture vehicle, driver, party, product"]
  C --> D["Capture first stable weight"]
  D --> E["Capture image evidence"]
  E --> F["Vehicle loads or unloads"]
  F --> G["Capture second stable weight"]
  G --> H["Server calculates gross, tare, net"]
  H --> I["Run anomaly rules"]
  I --> J{"Manual or suspicious?"}
  J -- "Yes" --> K["Flag for review or approval"]
  J -- "No" --> L["Approve or print as allowed"]
  K --> L
  L --> M["Link to dispatch, receipt, or transfer"]
```

Integrity controls:

- Stable weight detection.
- Duplicate-read prevention.
- Device signing.
- Image evidence.
- Print count tracking.
- Correction workflow with original and corrected values.

## 6. Inventory Workflow

```mermaid
flowchart TD
  A["Business event"] --> B["Validate permission and tenant"]
  B --> C["Validate product, unit, conversion"]
  C --> D["Check stock rule"]
  D --> E{"Allowed?"}
  E -- "No" --> F["Reject with reason"]
  E -- "Yes" --> G["Create immutable ledger entry"]
  G --> H["Update derived balance in same transaction"]
  H --> I["Audit if sensitive"]
```

Business events include purchase receipts, crusher consumption, crusher output, RMC consumption, sale dispatch, transfer issue/receipt, stock adjustment, physical count correction, returns, and wastage.

## 7. Sales, Dispatch, And Finance Workflow

```mermaid
flowchart TD
  A["Quotation"] --> B["Sales order"]
  B --> C["Credit and rate checks"]
  C --> D{"Exception?"}
  D -- "Yes" --> E["Approval required"]
  D -- "No" --> F["Dispatch planning"]
  E --> F
  F --> G["Vehicle assignment"]
  G --> H["Weighment or RMC batch dispatch"]
  H --> I["Delivery proof"]
  I --> J["Invoice"]
  J --> K["Receipt"]
  K --> L["Customer ledger update"]
```

Rules:

- Rate overrides require approval.
- Credit-limit exceptions require approval.
- Dispatch reduces inventory.
- Invoice and receipt update customer balance through financial ledger entries.

## 8. Quality Workflow

```mermaid
flowchart TD
  A["Create sample"] --> B["Record test results"]
  B --> C["Compare with specification"]
  C --> D{"Failed?"}
  D -- "Yes" --> E["Create alert and non-conformance"]
  D -- "No" --> F["Approve result"]
  E --> G["Corrective action"]
  G --> H["Closure approval"]
```

Quality tests must be configurable and linked to product, concrete grade, customer, plant, and specification where relevant.

## 9. Maintenance Workflow

```mermaid
flowchart TD
  A["Preventive plan or breakdown"] --> B["Create task/work order"]
  B --> C["Assign technician"]
  C --> D["Record parts, labour, meter readings"]
  D --> E["Close work"]
  E --> F["Approval"]
  F --> G["Update history and alerts"]
```

Rules:

- Work orders can consume spare parts.
- Breakdowns record downtime and root cause.
- Preventive tasks can be generated automatically.

## 10. Compliance Workflow

```mermaid
flowchart TD
  A["Configure template"] --> B["Create plant requirements"]
  B --> C["Upload document"]
  C --> D["Track issue and expiry dates"]
  D --> E["Reminder schedule"]
  E --> F["Renewal workflow"]
  F --> G["Audit and document history"]
```

Rules:

- Compliance templates are configurable by geography and plant type.
- The system tracks requirements and reminders but does not provide final legal certification.
- Compliance consultant actions are permissioned and audited.

## 11. WhatsApp Order Workflow

```mermaid
flowchart TD
  A["Customer message"] --> B["Bot asks for site, product, quantity, time"]
  B --> C["Create draft enquiry"]
  C --> D["Salesperson reviews rate, credit, vehicle, stock"]
  D --> E{"Approved?"}
  E -- "No" --> F["Respond with controlled message"]
  E -- "Yes" --> G["Create sales order"]
```

Rules:

- The bot cannot commit commercial terms without configured approval.
- All messages and draft actions are organisation-scoped and logged.

## 12. AI Assistant Workflow

```mermaid
flowchart TD
  A["User question"] --> B["Resolve tenant and permissions"]
  B --> C["Select safe tool"]
  C --> D{"Read-only or draft?"}
  D -- "Read-only" --> E["Fetch scoped data and cite sources"]
  D -- "Draft" --> F["Create draft action requiring approval"]
  E --> G["AI response"]
  F --> G
  G --> H["Log conversation, tool call, feedback"]
```

Rules:

- AI estimates are labelled.
- Missing data is not invented.
- AI cannot execute arbitrary SQL.
- AI cannot access another tenant.
- Sensitive actions require human confirmation.

## 13. Hardware And IoT Workflow

```mermaid
flowchart TD
  A["Device registered"] --> B["Credentials issued"]
  B --> C["Heartbeat received"]
  C --> D["Raw reading captured"]
  D --> E["Validate and store raw telemetry"]
  E --> F["Aggregate or trigger alert"]
  F --> G["Show status in UI"]
```

Rules:

- Raw telemetry is append-only.
- Calibration details and source status are visible.
- Low-cost environmental sensors are not treated as official compliance devices unless configured and verified.

## 14. Offline Synchronisation Workflow

```mermaid
flowchart TD
  A["User performs offline-capable action"] --> B["Create local operation with client ID"]
  B --> C["Store payload, hash, dependencies, user, device, plant"]
  C --> D["Show sync-pending state"]
  D --> E["Network returns"]
  E --> F["Submit with idempotency key"]
  F --> G["Server resolves session tenant and permissions"]
  G --> H{"Duplicate or conflict?"}
  H -- "Duplicate" --> I["Return existing accepted result"]
  H -- "Conflict" --> J["Create conflict for user review"]
  H -- "No" --> K["Apply transaction and audit"]
  I --> L["Mark local operation synced"]
  J --> M["Show resolution task"]
  K --> L
```

Rules:

- Offline records use client-generated IDs and idempotency keys.
- Sync never trusts locally stored organisation context without authenticated server validation.
- Approved or corrected records cannot be silently overwritten.
- Every failed sync keeps enough detail for retry, support, and audit.

## 15. Integration Event Workflow

```mermaid
flowchart TD
  A["Provider or device event"] --> B["Adapter validates credentials or signature"]
  B --> C["Normalise payload"]
  C --> D["Resolve organisation and plant connection"]
  D --> E["Validate schema and idempotency"]
  E --> F["Store integration event"]
  F --> G{"Business action needed?"}
  G -- "No" --> H["Update health or telemetry state"]
  G -- "Yes" --> I["Create draft, reading, alert, or queued job"]
  I --> J["Audit sensitive action"]
```

Rules:

- Credentials are encrypted and redacted from logs.
- Raw telemetry and integration events are append-only where practical.
- Provider-specific details stay behind adapter interfaces.
- Hardware readings become business records only after server-side validation and tenant checks.
