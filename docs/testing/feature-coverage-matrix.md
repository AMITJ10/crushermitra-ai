# CrusherMitra AI Feature Coverage Matrix

Functional status values: Fully working, Partially working, Static or mock only, Broken, Missing, Not testable.

| Module | Feature | Page | Role | Test status | Functional status | Data persistence | Permission status | Mobile status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Authentication | Seeded owner login | `/en/login` | Owner | Tested | Partially working | Cookie session | Demo fallback removed; full test run pending | Usable | Valid login works; invalid login now returns controlled failure |
| Authentication | Forgot/reset password | `/en/login` | User | Inspected | Missing | None | None | Missing | No forgot-password/reset UI |
| Authentication | Logout | App shell | User | Smoke tested visually | Partially working | Cookie cleared by route | Not fully tested | Usable | Back-button/session expiry not fully tested |
| Dashboard | Operational metrics | `/en/dashboard` | Owner | Tested | Partially working | PostgreSQL API | Requires session; DB verification pending | Usable | Runtime fallback removed; values now require PostgreSQL |
| Master Data | Customers CRUD | `/en/master-data` | Owner | E2E + API tested | Fully working for Phase 3 scope | PostgreSQL-backed | Signed session + server permissions + RLS | Mobile overflow E2E passed | Case-insensitive duplicate customer codes return 409 |
| Master Data | Sites, suppliers, products, units, prices, vehicles, drivers, machines, storage, shifts | `/en/master-data` | Owner | Unit/API/E2E slice | Partially working | PostgreSQL-backed | Server permissions + tenant/plant RLS | Mobile cards and accessible row actions verified | Full domain-specific detail pages deferred |
| Orders | Sales order list/create | `/en/orders` | Owner/Dispatch | Tested smoke | Broken | API has local rows, UI showed none | Auth bypass in local | Usable but dense | No credit checks, quotation, approval workflow |
| Dispatch | Dispatch/weighbridge list/create | `/en/dispatch` | Dispatch manager | Tested smoke | Partially working | PostgreSQL API not verified live | Auth bypass fixed pending full tests | Dense table | Basic dispatch exists; no proof of delivery/slip/offline |
| Operations | Crusher/RMC operation records | `/en/operations` | Plant manager | Tested smoke/code | Partially working | PostgreSQL API not verified live | Generic permission only | Dense table | Completed rows appear editable/deletable |
| Reports | Operational reports | `/en/reports` | Owner/Accountant | Tested | Partially working | Client aggregates APIs | Export gated by local storage subscription | Charts readable | Totals can double-count; no server-generated PDFs |
| Reports | CSV/PDF export | `/en/reports` | Owner/Accountant | Tested state | Partially working | Browser-generated | Gated client-side | Not fully mobile-tested | Disabled for current owner; print-to-PDF only |
| Billing | Plan selection | `/en/billing` | Owner | Inspected | Partially working | Local storage | No server subscription source | Usable | Local sandbox unless Razorpay keys configured |
| Billing | Razorpay payment | `/api/v1/billing/razorpay/*` | Owner | API tested | Partially working | Not DB-backed in verified env | Signature verify route exists | N/A | Order endpoint 503 without keys; webhooks absent |
| Profile | User profile and Indian location fields | `/en/profile` | User | Inspected | Partially working | Browser local storage | Not server-backed | Long form | State/district dropdowns present |
| More | Additional tools | `/en/more` | User | Tested | Static or mock only | None | None | Usable | Placeholder only |
| Admin | Protected admin routes | `/admin/*` | Platform admin | Tested unauth redirect | Partially working | Admin session cookie | Redirects unauth users | Not tested mobile | Login credentials not fully tested |
| Admin | Users | `/admin/users` | Platform admin | Route smoke | Static or mock only | Local storage | Admin session required | Not fully tested | No real server-backed user management |
| Admin | Payments | `/admin/payments` | Platform admin | Route smoke/code | Partially working | Local storage only in current UI | Admin session required | Not fully tested | Fake records filtered, but no DB payment lifecycle |
| Admin | Reports | `/admin/reports` | Platform admin | Route smoke/code | Partially working | Local storage only | Admin session required | Not fully tested | CSV/PDF client-side; no DB report source |
| Admin | Leads | `/admin/leads` | Platform admin | Code/route smoke | Partially working | In-memory leads store | Admin session required | Not fully tested | Not DB-backed in current code path |
| Inventory | Ledger stock | No user route | Inventory user | Code inspected | Missing | Migrations/domain tests exist, no UI/API workflow | Not testable | Missing | Cannot complete stock workflows |
| Purchase | Supplier purchase receipt | No route | Purchase/accounting | Route audit | Missing | None verified | Not testable | Missing | Required workflow absent |
| Weighbridge | First/second weight/slip/correction | No dedicated route | Weighbridge operator | Route/code audit | Missing | Foundation schema exists | Not testable | Missing | Dispatch has weights but no weighbridge workflow |
| RMC | Mix design and batch | No dedicated route | RMC manager | Route audit | Missing | None verified | Not testable | Missing | Operation type only, no mix design or batching |
| Quality | Aggregate/RMC tests | No route | Quality engineer | Route audit | Missing | None verified | Not testable | Missing | No quality UI/API workflow |
| Maintenance | Work orders/assets | No route | Maintenance engineer | Route audit | Missing | None verified | Not testable | Missing | No maintenance workflow |
| Compliance | Documents/renewals | No route | Compliance manager | Route audit | Missing | None verified | Not testable | Missing | No compliance workflow |
| Finance | Invoice/receipt/ledger/GST | Billing workflow only | Accountant | Smoke/code | Partially working | PostgreSQL API not verified live | Auth bypass fixed pending full tests | Not fully tested | No GST ledger, ageing, credit notes |
| AI | Assistant/advisory actions | No user route | Owner/Manager | Service/code checked | Static or mock only | Safe-tool registry code only | Not testable | Missing | AI service not running; no UI |
| Notifications | Email/WhatsApp/SMS | Lead/contact code | Admin | Code checked | Static or mock only | Logs only | Not testable | N/A | Provider implementation pending |
| Tenant isolation | Server scoping/RLS | API/database | All roles | PostgreSQL verifier + E2E | Partially working | RLS verified through app role | Local auth bypass removed | N/A | Cross-tenant tests exist for current protected paths; deeper role matrix remains later |
| CI | GitHub Actions | `.github/workflows/ci.yml` | Developer | Inspected | Partially working | N/A | N/A | N/A | CI defined; local pnpm/Vitest blocked |
