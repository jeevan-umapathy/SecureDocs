# Paused checkpoint — 14 October 2026

User requested stopping to conserve usage. Local checkpoint; delivery is not complete.
Branch: codex/dbms-review-dashboard, based on main 3bd8ff3. No push or PR yet.

## Implemented and tested
- Existing white/grey dashboard and dark auth style preserved. Responsive auth forms, file cards, search/Clear, upload feedback/reset, accessible native dialogs, centralized API configuration.
- Owner recipient listing/revocation; recipients remain download-only.
- Activity and admin tabs backed by PostgreSQL. Roles/status checked in the database on every authenticated request; disabled existing tokens blocked. Public users endpoint secured, secrets omitted.
- Additive re-runnable migration; transaction-coupled audit writes for mutations; successful-download auditing; deletion keeps filename snapshots.
- Multer upload directory typo fixed. Local storage and legacy relative download paths retained.
- Environment examples, migration/promotion scripts, disposable database tests added.

Verification: frontend lint/build pass. Backend npm test passes all 10 tests against disposable PostgreSQL: migration preservation/idempotence, auth/default roles, permissions, disabled tokens, sharing/revocation, activity isolation, deletion snapshots, aggregates, audit-failure rollback including revoke, upload cleanup/limits, failed-download auditing.
Browser inspected at 1366x900 and 390x844: login, search/Clear, recipients, Escape, keyboard rename, Activity, admin disable, mobile registration. No console errors/warnings. Mobile inspection found and fixed auth hover contrast; final lint/build passed.
Screenshots: ignored .test-runtime/admin-desktop.png and admin-mobile.png.

## Data safety
Application database inspected READ ONLY; no migration or promotion applied to it. Existing users/files/shares and constraints verified. Legacy is_admin/totp_secret preserved. No paid service provisioned. Testing used separate disposable databases and files.

## Remaining work on resume
1. Finish README and exact pull/install/migrate/promote/run steps, plus DBMS explanation of tables, FKs, joins, aggregates, indexes and access control.
2. Document: completed-download audit is best effort; file unlink follows metadata/audit commit and can leave inaccessible disk orphans on failure. Revocation cannot recall downloaded copies or cancel already authorized transfers. No historical event reconstruction. Activity limits: 100 personal/200 system.
3. Document migration prerequisites: existing tables with integer IDs; duplicate case-insensitive emails or shares cause safe rollback, never data deletion. Legacy is_admin does not auto-promote.
4. Final diff/whitespace review. Optional remaining UI upload/revoke/delete checks; backend covers those endpoints. No new dependencies.
5. Push branch, create PR, attach PR, deliver instructions and limitations.
6. Original requirements/tracker describe planned MFA/folders/cloud features: make implemented scope explicit. MFA/cloud integration remain unfinished follow-ups; no percentage-complete claim.

## Supported setup
Preserve backend/.env; compare backend/.env.example. Optional frontend/.env uses VITE_API_URL.
From root: npm install; npm install --prefix backend; npm install --prefix frontend (run separately).
Back up PostgreSQL and backend/uploads first.
- npm run migrate --prefix backend
- npm run promote --prefix backend -- your-existing-email@example.com
- npm run dev
Default frontend: http://localhost:5173; API: http://localhost:3000.
Promotion SQL: UPDATE users SET role='admin', is_active=true WHERE lower(email)=lower('your-existing-email@example.com') RETURNING id,email,role;
Tests: npm test --prefix backend requires CREATEDB and creates/removes only securedocs_test_<timestamp> databases.

## Cloud research verified 14 October 2026
Supabase Free: 1 GB file storage, 50 MB per object, 5 GB uncached plus 5 GB cached egress, two active projects, pause after one week inactivity. No Free charges; sustained quota excess causes restrictions. No card required on Free (official July 2026 article). Paid usage requires upgrade. Keep local storage; private cloud storage/server-authorized downloads can follow later.
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/cost-control
- https://supabase.com/docs/guides/platform/billing-faq
- https://supabase.com/blog/observability-for-every-supabase-project-with-grafana-cloud

Earlier drafts recovered from chat 01a084da-07cf-7721-b1a3-7bac2daf704f on durable host; no pushed dashboard branch existed. Reused useful migration/admin/activity structure and strengthened consistency.
