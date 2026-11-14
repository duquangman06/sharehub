# ShareHub: Vietnamese interface and visual refresh

## Scope

- Vietnamese interface text, navigation, validation feedback, notifications, route titles, category names, status labels, calendar labels and public API messages.
- Existing brand retained; cream, navy, coral, ochre and muted blue/sage replace the predominantly green palette.
- Homepage includes an animated equipment collage, search, category photography, navigable featured equipment, rental process, platform story, owner invitation and FAQs.
- Shared controls and role-specific screens refreshed, including checkout, rental calendar, handover progress, owner listings, analytics, verification and administration.
- Responsive native-dialog navigation supports keyboard dismissal and focus containment. Motion respects `prefers-reduced-motion`.

## Preserved behaviour

API routes, request fields, stored enum values, booking transitions, fee/deposit calculation, consent requirements, simulated payment and access controls are retained. Vietnamese enum/category labels are presentation mappings. Existing product model names and member-provided content remain intact.

The owner listing Edit link now targets the existing edit route without duplicating its `assets` segment. New listing guidance reflects the existing moderation rule.

## Validation

- Angular production build passes (existing Leaflet CommonJS advisory remains).
- Backend suite: 18 passed, 1 skipped; the real replica-set integration test still requires `MONGO_TEST_URI`.
- Source-contract comparison confirms backend rule code and existing rental calculations/lifecycle handlers are unchanged apart from text.
- Browser checks cover homepage, authentication, owner listings, date selection, draft checkout, consent-disabled payment, search and mobile navigation.
- The observed two-day Canon example remains VND 360,000 rent plus VND 500,000 deposit = VND 860,000. The draft was cancelled; no payment or rental was created.

## Deployment

Use the project's existing GitHub–Vercel integration and existing production environment variables. No new infrastructure, framework migration or database migration is required.
