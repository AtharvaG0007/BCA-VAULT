# BCA Vault — Production CI/CD Documentation

## 1. Overview & Architecture

BCA Vault uses a continuous delivery pipeline designed for production safety, deterministic validation, and isolation of secrets.

```
Developer Push → main (GitHub)
       ↓
GitHub Actions CI/CD (.github/workflows/ci-cd.yml)
  ├── 1. CI Validation Gate (npm ci, typecheck, edge types, test suite, vite build)
  ├── 2. Database Migrations (supabase db push --dry-run → supabase db push)
  ├── 3. Edge Functions Deployment (bca-admin, email-admin, student-note-signed-url, etc.)
  └── 4. Verification (Health check & deployment audit)
       +
Cloudflare Workers Builds / Git Integration
  └── Automatically builds & deploys frontend to https://bca-vault.portalbcavault.workers.dev
```

---

## 2. Main-Only Production Policy

- **Branch Policy**: `main` is the sole production branch.
- **Trigger**: Every `git push origin main` triggers the CI/CD pipeline.
- **Safety Gate**: Deployment jobs (`database-migrations` and `edge-functions`) strictly depend on `ci` passing. If linting, typechecking, edge runtime compilation, or frontend build fails, all deployment stops immediately.
- **No Force Push**: All updates to `main` must be clean, sequential commits.

---

## 3. CI Checks

The `ci` job executes in an isolated Ubuntu container:

1. **`npm ci`**: Installs exact dependencies using the committed `package-lock.json`.
2. **`npm run typecheck`**: Runs `tsc --noEmit` across all React components, pages, services, and routes.
3. **`npx tsc -p supabase/functions/tsconfig.json --noEmit`**: Compiles all Supabase Edge Functions under strict Deno/TypeScript configuration (`noImplicitAny: true`).
4. **`npx tsx scripts/test_edge_functions_types.ts`**: Runs the 12-check automated suite validating ambient types, Deno imports, and function contracts.
5. **`npm run build`**: Executes `vite build`, outputting production-ready static assets to `dist/`.
6. **Artifact verification**: Confirms `dist/index.html` exists before clearing the gate.

---

## 4. Cloudflare Deployment Method

- **Host**: Cloudflare Workers / Pages at `https://bca-vault.portalbcavault.workers.dev`.
- **Integration**: Cloudflare Git Integration (Workers Builds) is connected directly to the GitHub repository `AtharvaG0007/BCA-VAULT` on branch `main`.
- **Wrangler Policy**: Wrangler is **not** run in GitHub Actions to prevent duplicate, conflicting, or out-of-sync worker deployments. When code is pushed to `main`, Cloudflare automatically builds and deploys the latest frontend.

---

## 5. Supabase Database Migrations

- **Directory**: `supabase/migrations/`
- **Tool**: Supabase CLI (Pinned to version `2.116.0` via `supabase-community/setup-cli@v1`)
- **Execution Workflow**:
  1. **Pre-flight Dry Run**:
     ```bash
     supabase db push --dry-run --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
     ```
  2. **Migration Application**:
     ```bash
     supabase db push --project-ref "$SUPABASE_PROJECT_REF" --password "$SUPABASE_DB_PASSWORD"
     ```
- **Safety Rules**:
  - `supabase db reset` is **strictly prohibited** in all environments.
  - If a migration error occurs, the job exits with a non-zero code, preventing Edge Functions deployment.

---

## 6. Supabase Edge Functions Deployment

Edge Functions are deployed using the Supabase CLI (pinned to `2.116.0`) with `--use-api` (containerless, fast server-side bundling via the Supabase Management API):

### Function-by-Function JWT Verification Policy

| Edge Function | `verify_jwt` Setting | Deployment Command | Production Rationale & Evidence |
| :--- | :--- | :--- | :--- |
| **`email-admin`** | `false` (`--no-verify-jwt`) | `supabase functions deploy email-admin --project-ref "$SUPABASE_PROJECT_REF" --use-api --no-verify-jwt` | **Definitive Requirement**: Serves public Google OAuth redirects (`/google/start`, `/google/callback`). Google does not send Supabase JWTs. Internal admin auth is strictly enforced in code via `requireAdmin()`. |
| **`payment-evidence`** | `false` (`--no-verify-jwt`) | `supabase functions deploy payment-evidence --project-ref "$SUPABASE_PROJECT_REF" --use-api --no-verify-jwt` | **Definitive Requirement**: Handles unauthenticated students submitting UPI payment evidence before account creation (`getOptionalUser()`). |
| **`public-support-chat`** | `false` (`--no-verify-jwt`) | `supabase functions deploy public-support-chat --project-ref "$SUPABASE_PROJECT_REF" --use-api --no-verify-jwt` | **Definitive Requirement**: Serves public landing page visitors without accounts. Source header explicitly specifies: *"It does NOT require authentication."* |
| **`gemini-chat`** | `false` (`--no-verify-jwt`) | `supabase functions deploy gemini-chat --project-ref "$SUPABASE_PROJECT_REF" --use-api --no-verify-jwt` | **Definitive Requirement**: Public study assistant supporting both anonymous visitors and authenticated students. |
| **`bca-admin`** | `true` (default) | `supabase functions deploy bca-admin --project-ref "$SUPABASE_PROJECT_REF" --use-api` | **Definitive Requirement**: Strictly authenticated Super Admin dashboard operations. Client always passes valid Admin Auth JWT (`adminSupabase.auth.getSession()`). |
| **`exam-kits`** | `true` (default) | `supabase functions deploy exam-kits --project-ref "$SUPABASE_PROJECT_REF" --use-api` | **Definitive Requirement**: Student orders and protected content require an authenticated user JWT; the handler also checks student/admin role and entitlement before privileged operations. |
| **`student-note-signed-url`** | `true` (default) | `supabase functions deploy student-note-signed-url --project-ref "$SUPABASE_PROJECT_REF" --use-api` | **Definitive Requirement**: Strictly authenticated student access to protected course notes. Deployed with default gateway verification per `docs/PROTECTED_PDF_ARCHITECTURE.md`. |
| **`student-learning-chat`** | `true` (default) | `supabase functions deploy student-learning-chat --project-ref "$SUPABASE_PROJECT_REF" --use-api` | **Definitive Requirement**: Strictly authenticated student AI assistant. Source header explicitly specifies: *"This Edge Function serves ONLY authenticated students... It NEVER serves public/anonymous visitors."* |

---

## 7. Secrets Architecture

### A. GitHub Actions Repository Secrets (Deployment-Only)
Configure these under **GitHub Repository Settings → Secrets and variables → Actions**:

| Secret Name | Purpose | Example / Format |
| :--- | :--- | :--- |
| `SUPABASE_ACCESS_TOKEN` | Personal Access Token from Supabase Dashboard (Account → Access Tokens) | `sbp_...` |
| `SUPABASE_DB_PASSWORD` | Postgres database password for remote project `dmxegktlxqsxaysqwswa` | `<db-password>` |
| `SUPABASE_PROJECT_REF` | Optional. Project reference ID (defaults to `dmxegktlxqsxaysqwswa`) | `dmxegktlxqsxaysqwswa` |

### B. Supabase Edge Function Secrets (Runtime-Only — NEVER in GitHub)
These runtime secrets remain securely stored in Supabase (Dashboard → Project Settings → Edge Functions → Secrets):
- `GOOGLE_REFRESH_TOKEN` (Gmail API OAuth refresh token)
- `GOOGLE_CLIENT_SECRET` (Google OAuth Client Secret)
- `GOOGLE_CLIENT_ID` (Google OAuth Client ID)
- `GEMINI_API_KEY` (Google Gemini API Key)
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SECRET_KEY` (Supabase backend service role key)

---

## 8. Manual Workflow Execution

To trigger the pipeline manually without pushing code:
1. Navigate to the **Actions** tab in the GitHub repository.
2. Select **Production CI/CD** from the left sidebar.
3. Click the **Run workflow** dropdown.
4. Select branch `main` and click **Run workflow**.

---

## 9. Troubleshooting & Diagnostics

### CI Validation Fails:
- **Frontend Type Error**: Run `npm run typecheck` locally to identify the error.
- **Edge Function Type Error**: Run `npx tsc -p supabase/functions/tsconfig.json --noEmit` locally.
- **Vite Build Error**: Run `npm run build` locally and inspect missing imports or syntax issues.

### Migration Fails:
- Verify `SUPABASE_DB_PASSWORD` is correctly configured in GitHub Secrets.
- Check Supabase Dashboard Database Migration history to ensure migration timestamps are strictly sequential.

### Edge Function Deployment Fails:
- Verify `SUPABASE_ACCESS_TOKEN` is valid and has not expired.
- Check if the Supabase Management API is reachable.

---

## 10. Post-Deployment Verification

1. Inspect the **Deployment Verification** step in GitHub Actions for HTTP 200 health responses.
2. Visit `https://bca-vault.portalbcavault.workers.dev` to verify the live frontend.
3. Log into the Super Admin Email Console at `/admin/email` to confirm edge functions communicate properly with the Gmail API and Supabase database.
