# SecureDocs
Secure Cloud File Sharing Platform with Multi-Factor Authentication

## DBMS review setup

The Activity and Admin features require the additive PostgreSQL migration in
`backend/migrations/001_activity_admin.sql`. It keeps existing users, files,
and shares. Back up your database and `backend/uploads` before applying it.

From the repository root, with `backend/.env` pointing to the existing database:

```bash
npm run migrate --prefix backend
npm run promote --prefix backend -- your-existing-email@example.com
npm run dev
```

Use the email of an account you already registered. Sign out and back in to
refresh the Admin tab. The server checks the required schema at startup and
prints the migration command if it has not been applied.

Activity starts recording events after the migration. Earlier file actions
cannot be reconstructed. Owners can see recipients and revoke future downloads;
people who already downloaded a copy still have that copy. Ordinary accounts
cannot use Admin routes, and disabled accounts cannot sign in or use an old JWT.

For the review, the tables are `users`, `files`, `shares`, and `audit_logs`.
Foreign keys connect ownership, recipients, and actors. The Admin totals use
aggregate queries; the recipient list joins `shares`, `files`, and `users`.
File changes and their audit rows share a database transaction where possible.
The file bytes remain on local disk.
