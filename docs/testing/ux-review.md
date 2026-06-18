# CrusherMitra AI UX Review

## Positive Aspects

- The application has a clear left navigation model for the main user workflow areas.
- Master Data groups the expected Phase 2 entities in one place.
- Forms use labelled fields, required markers and visible save/cancel controls.
- State and district dropdowns are useful for Indian plant users.
- Reports have meaningful operational categories and coloured charts.
- The dashboard avoids earlier fake company names and uses operational metrics.
- Admin routes are separated from tenant user routes.

## Confusing Areas

- Dashboard values appear even when recent activity says no data is available.
- Orders page can show no rows while dashboard/reports show order values.
- Billing says local development simulation while the product language elsewhere implies production readiness.
- Reports export is disabled without a clear direct recovery path except a generic upgrade message.
- More page is an empty placeholder and does not help users find AI/settings/tools.
- Workflow pages use generic operation types rather than concrete crusher/RMC terminology.
- Dispatch net weight displays `42000` beside `42 t`, but unit conversion is not explained.
- Report sales value basis is unclear and appears to double-count order and invoice amounts.

## Unnecessary Steps

- Users must go through Master Data before many workflow forms become usable, but missing prerequisites are not actionable links.
- Reports require subscription state from browser local storage rather than showing a server-confirmed plan and upgrade action.
- Admin report filters and payment data are separated from real gateway configuration state.

## Mobile Issues

- 360 x 800 master-data layout has horizontal overflow.
- Large tables are technically scrollable but hard to operate on small screens.
- Sidebar text disappears on mobile in some snapshots while bottom navigation duplicates links, which may confuse users.
- Dense forms are long on mobile and lack step grouping for field-heavy master data.

## Accessibility Issues

- Several icon-only row action buttons have empty accessible names.
- Chart values do not have robust textual alternatives beyond visible legends.
- Error messages are not consistently associated with individual form fields.
- Modal focus-trapping was not fully verifiable.
- Keyboard-only flow needs a full pass; current forms appear usable but row actions are not clearly named.

## Language Issues

- English UI is mostly readable.
- Hindi and Marathi localisation files exist, but the audit did not complete full translated workflow validation.
- Some domain terms remain generic and may not match non-technical plant vocabulary.
- AI test prompts in Hindi/Marathi could not be executed because no AI assistant UI/service was available.

## Suggested Improvements

- Replace generic workflow labels with plant-language tasks: Crusher Run, RMC Batch, Weighment, Delivery Challan, Invoice, Receipt.
- Add guided workflow cards for daily plant users: "Record production", "Create dispatch", "Collect payment", "Print report".
- Add direct prerequisite links when forms are blocked by missing master data.
- Add server-backed subscription and payment status everywhere instead of browser-local status.
- Add explanatory formulas and source links for dashboard/report cards.
- Add named row actions, keyboard focus states and accessible chart descriptions.
- Add mobile-first data-entry flows for weighbridge, dispatch and production.
- Add onboarding checklist for owner/admin setup.

## Overall User-Experience Score

4.5 / 10

The UI is coherent for a scaffolded internal tool, but it is not yet ergonomic enough for real crusher/RMC plant use. The largest UX problems are incomplete workflows, inconsistent data, placeholder modules, disabled exports under unclear subscription state, and mobile density.
