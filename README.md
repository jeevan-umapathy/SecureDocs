# SecureDocs
Secure Cloud File Sharing Platform with Multi-Factor Authentication

## DBMS review setup

The additive migrations add Activity, Admin, folders, and authenticator MFA.
They preserve existing users, files, and shares. Back up the PostgreSQL database
and `backend/uploads` before applying them.

From the repository root, with `backend/.env` pointing to the existing database:

```bash
npm ci --prefix backend
npm ci --prefix frontend
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
File bytes remain on local disk unless Supabase storage is configured below.

## Authenticator MFA

Generate a permanent encryption key once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put it in `MFA_ENCRYPTION_KEY` in `backend/.env`. Keep a secure backup of the
key: losing it makes enrolled authenticator secrets unreadable. Sign in, open
**Security**, confirm your password, scan the QR code in an authenticator app,
and enter the six-digit code. Future sign-ins require password then code.
Changing MFA signs out old sessions. Recovery codes and account recovery are
not implemented, so retain access to your authenticator while testing.
After enabling MFA, wait for the next six-digit code before signing in again;
the setup code is consumed once.

## Folders and cloud storage

**My Files** now has folders. A file belongs to one folder or the root; only
empty folders can be deleted. Existing files remain in the root after migration.

The default `STORAGE_DRIVER=local` keeps uploads in `backend/uploads`. To use
cloud storage, create a **private** Supabase Storage bucket and set these in
`backend/.env`:

```text
STORAGE_DRIVER=supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_BUCKET=private-files
SUPABASE_SECRET_KEY=your-server-only-secret-key
```

Restart the backend. New uploads go to the private bucket; existing local files
still download from disk. Keep the secret key only in backend environment
settings. The backend checks PostgreSQL ownership/shares before fetching an
object. Never make the bucket public. The app's upload limit is 5 MB. Supabase's
Free plan currently includes 1 GB of file storage and up to 50 MB per file;
verify current limits before enabling a project. Its free projects can pause
after inactivity. Cloud setup cannot be tested without your own project keys.
If cloud deletion fails after the database record is removed, the backend logs
an orphaned object for manual cleanup; no further download is authorized.

## Tests and local Docker release

```bash
npm test --prefix backend
npm run lint --prefix frontend
npm run build --prefix frontend
```

For a **fresh, separate local database** on Docker Desktop, copy `.env.example`
to `.env`, set strong `DB_PASSWORD`, `JWT_SECRET`, and a permanent
`MFA_ENCRYPTION_KEY`, then run `docker compose up --build`. The site opens at
`http://localhost:8080`. Docker uses its own PostgreSQL volume; it does not
import your existing Windows PostgreSQL data or local uploads. Stop with
`docker compose down` to preserve the volumes.

Public hosting needs a provider, HTTPS, production secrets, backups, and an
allowlisted `FRONTEND_ORIGIN`; it is not provisioned by this repository.
