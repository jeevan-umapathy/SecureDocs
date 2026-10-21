# SecureDocs

SecureDocs is a React, Express, and PostgreSQL file sharing project. Registered users upload and manage their own files, share them with other registered users, and download files shared with them. The current implementation stores file contents on the backend's local disk; PostgreSQL stores accounts, metadata, permissions, and activity.

## What works

- Registration and login with bcrypt password hashes and JWT authentication.
- Owner-only upload, search, rename, and deletion. Supported uploads: PDF, JPG, PNG, PPT, PPTX, up to 5 MB.
- Share by registered email; recipients can list and download files. Owners can see recipients and revoke access. A recipient cannot rename, delete, or reshare the owner's file.
- Personal Activity and an admin panel with account counts, file/share totals, recent system events, and account enable/disable controls. Disabling an account blocks its existing token on the next request. Admins cannot disable themselves or other admins through this panel.
- Responsive desktop/mobile dashboard with search Clear, upload feedback, file action dialogs, and error states.

## Run locally

Prerequisites: Node.js and a running PostgreSQL database containing this project's existing `users`, `files`, and `shares` tables. The migration is additive; it does not create the original tables. Existing IDs must be integers. Back up the database and `backend/uploads` before migrating an existing installation.

1. Pull this branch and install dependencies, from the repository root:

   ```bash
   npm install
   npm install --prefix backend
   npm install --prefix frontend
   ```

2. Copy `backend/.env.example` to `backend/.env`. Set the `DB_*` values for your PostgreSQL database (or `DATABASE_URL`), a long random `JWT_SECRET`, and `FRONTEND_ORIGIN` if the frontend is on a different origin. Preserve your existing `.env` and uploads when updating. Optionally set `VITE_API_URL` in `frontend/.env` if the API is not at `http://localhost:3000`.
3. Apply the migration **once before starting this version**. It is safe to rerun:

   ```bash
   npm run migrate --prefix backend
   ```

   Case-insensitive duplicate user emails or duplicate file/recipient shares cause a migration error and rollback. Resolve those records deliberately; the migration never deletes or merges them. Existing `is_admin` and `totp_secret` columns are preserved. The new admin role is not assigned from the legacy `is_admin` flag.

4. To use the admin panel, register or choose **your own** existing account, then promote its email explicitly:

   ```bash
   npm run promote --prefix backend -- your-email@example.com
   ```

   Log out and log in again after promotion. Skip this step if you only need normal user features.

5. Start both applications from the root:

   ```bash
   npm run dev
   ```

   Open `http://localhost:5173`; the API defaults to `http://localhost:3000`. `npm run dev` needs the root dependencies installed because it uses `concurrently`.

## Demonstrate

Use two registered accounts, preferably in a normal and private browser window. Upload a small supported file as A; search, rename, and share it with B's email. Log in as B, open **Shared with me**, and download it. In A's **Share & manage access** dialog, revoke B. B's next download request must be denied. Open **Activity** to see the new actions. After promoting A, open **Admin panel** to see totals and disable a separate non-admin test account; that account's existing session can no longer make authenticated requests. Do not disable a real user's account just to run a demo.

## Database design

`users.id` owns many `files` through `files.owner_id`. `shares` links a file to a recipient user (`file_id`, `shared_with`), representing the many-to-many sharing relationship without copying the file. Its foreign keys prevent invalid references, and the unique file/recipient pair prevents duplicate grants. Shared-file queries join `shares`, `files`, and the owner's `users` row. Download authorization checks ownership **or** an existing share on the server; hiding buttons in React is only a usability measure.

Migration `backend/migrations/001_activity_admin.sql` adds `users.role`, `users.is_active`, and `audit_logs`, plus indexes for owner/time, recipient, email uniqueness, and recent activity. The admin overview uses database aggregates. Parameterized SQL keeps request values separate from query text. File metadata, share changes, and their audit entries are committed in a transaction where applicable. Deleted file names remain as snapshots in audit details; log rows may retain a null `file_id` or `actor_id` when the referenced row is deleted.

## Checks

```bash
npm run lint
npm run build
npm test
```

The backend test command creates and drops a **disposable PostgreSQL database** named `securedocs_test_<timestamp>` on your configured server. It needs a PostgreSQL role with `CREATEDB`; it does not migrate or drop your application database. Frontend lint/build run without PostgreSQL. Read `backend/tests/disposable.js` before running tests against a shared server.

## Scope and limits

Local storage is the current storage implementation. No cloud provider, paid service, MFA, folder system, or file preview is integrated in this branch. The separate guest transfer experiment is not part of this branch. Do not present those as finished features.

Activity starts when this migration and version are installed: it cannot reconstruct earlier events. The personal feed shows the latest 100 events and the admin feed the latest 200. Successful download audit is best effort because the response may already have been sent. A file unlink happens after its metadata/audit database transaction; a disk failure can leave an inaccessible orphan, which should be cleaned up by an operator. Revoking access blocks later authorization checks but cannot retract a previously downloaded copy or cancel an already authorized in-progress transfer.
