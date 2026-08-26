============================================================
BCA VAULT — MASTER PROJECT CONTEXT FOR CODEX
============================================================

You are taking over an existing BCA Vault project originally
created using Figma AI.

DO NOT assume the existing implementation is production-ready.

You must understand the existing architecture, preserve useful
work, remove conflicting implementations, and progressively
convert the project into a secure production application.

============================================================
PRODUCT
============================================================

Product name:

BCA Vault

Purpose:

A paid BCA study-material platform providing theory-focused
academic content.

Primary users:

1. Student
2. Admin
3. Superadmin

Current product:

BCA Vault — Complete Theory Bundle

Price:

₹899

Includes:

- Theory Notes
- Previous Year Questions
- PYQ Analysis
- Most Repeated Questions
- Important Exam Topics

Excludes:

- Mathematics
- Labs
- Practicals
- Projects

Current launch:

Semester 1
Semester 2

Semester 3–8:

Coming Soon

============================================================
AUTHENTICATION REQUIREMENT
============================================================

Firebase Authentication MUST remain the permanent authentication
provider.

DO NOT use Supabase Auth.

Firebase Auth handles:

- Signup
- Login
- Password
- Password reset
- Email verification
- Google OAuth if retained
- Identity
- Firebase UID

Firebase UID is the permanent identity bridge.

============================================================
DATABASE ARCHITECTURE
============================================================

Firebase:

Authentication
+
Realtime Database

Firebase SQL Connect:

Temporary relational database for approximately 90 days.

Supabase PostgreSQL:

Permanent application database.

Supabase Storage:

Permanent private file storage.

Google Form:

Manual payment submission.

Google Sheet:

Operational payment review queue.

Backend:

Security boundary.

============================================================
90-DAY STRATEGY
============================================================

During first 90 days:

Firebase Auth
      ↓
Backend
      ↓
Firebase SQL Connect
      +
Supabase PostgreSQL

Student/application data must be synchronized to both.

Actual files:

Supabase Storage only.

After SQL Connect expires:

Firebase Auth
      ↓
Backend
      ↓
Supabase PostgreSQL
      ↓
Supabase Storage

No student account migration.

No password migration.

No new authentication system.

============================================================
IDENTITY
============================================================

Firebase UID is the permanent identity.

Example:

Firebase Auth UID:

abc123

Firebase RTDB:

users/abc123

SQL Connect:

firebase_uid = abc123

Supabase:

firebase_uid = abc123

Never create duplicate authentication identities.

Never match accounts only by email.

============================================================
FIREBASE RTDB
============================================================

Use for:

users/{uid}

Profile:

uid
email
name
phone
college
course
semester
role
status
createdAt
updatedAt

Role values:

member
admin
superadmin

Default signup:

member

Users cannot self-promote.

============================================================
SQL CONNECT
============================================================

Use relational database for:

users
bundles
semesters
subjects
units
materials
orders
payments
user_bundle_access
coupons
coupon_usage
audit_logs

Use UUIDs.

Use Firebase UID as cross-system identity.

Do not store passwords.

Do not store PDF binaries.

============================================================
SUPABASE POSTGRESQL
============================================================

Permanent relational application database.

Mirror important application data from SQL Connect during the
90-day period.

The same logical record must use stable IDs.

Do not create duplicate records during synchronization.

Use idempotent operations.

============================================================
SUPABASE STORAGE
============================================================

Private bucket:

bca-vault-notes

Store:

PDF
Theory Notes
PYQ
PYQ Analysis
Most Repeated Questions
Important Questions

Do not use Firebase Storage for new study content.

Do not make the bucket public.

Store only:

storagePath

in databases.

Never expose permanent public file URLs.

Use short-lived signed URLs.

============================================================
AUTHORIZATION
============================================================

Frontend route protection is NOT security.

Backend must:

1. Receive Firebase ID token.
2. Verify Firebase token.
3. Determine Firebase UID.
4. Determine trusted role.
5. Authorize operation.
6. Query SQL/Supabase.
7. Return safe response.

Student:

member

Admin:

admin

Superadmin:

superadmin

Student cannot:

- upload notes
- delete notes
- approve payment
- grant access
- modify roles
- modify prices
- modify discount
- access unauthorized material

Admin cannot:

- promote itself to superadmin

Superadmin can:

- manage admins
- manage roles
- manage users
- manage materials
- manage bundles
- view audit logs

============================================================
ROUTES
============================================================

Public:

/
 /notes
 /semester/:sem
 /pyq
 /pyq/analysis
 /bundles
 /pricing
 /purchase
 /success
 /terms-and-conditions
 /privacy-policy
 /legal-consent

Authentication:

/auth/login
/auth/signup

Admin:

/admin-login
/admin/dashboard

Superadmin:

/admin-root-login
/admin-root/dashboard

Student:

/app/dashboard

Role redirect:

/dashboard

============================================================
ADMIN NOTES
============================================================

Admin dashboard must support:

Upload Note
Delete Note
View Note
Search
Filter
Publish/unpublish

Upload:

Admin
↓
Firebase token
↓
Backend verifies admin
↓
Generate secure Supabase upload
↓
Upload PDF
↓
Store metadata
↓
SQL Connect
↓
Supabase DB
↓
Audit log

Delete:

Admin
↓
Verify
↓
Delete Supabase file
↓
Delete/soft-delete metadata
↓
Audit log

============================================================
BUNDLE ACCESS
============================================================

Current product is ONE bundle.

Access must be bundle-level.

Student:

Firebase UID
↓
user_bundle_access
↓
BCA Vault Complete Theory Bundle
↓
Authorized materials

Do not use individual note access as the primary purchase model.

============================================================
PAYMENT
============================================================

Manual UPI.

Student:

Purchase
↓
UPI QR
↓
Payment
↓
Google Form
↓
Payment screenshot
↓
UTR
↓
Registered Firebase email

Admin:

Review
↓
Verify
↓
Approve/reject
↓
Grant/revoke bundle access

Google Form submission alone MUST NOT grant access.

============================================================
COUPONS
============================================================

BUDMS50:

₹50 OFF
Final ₹849

WINNER150:

₹150 OFF
Final ₹749

No coupon:

₹899

Only one coupon per order.

Backend determines actual discount.

Never trust frontend price.

============================================================
SECURITY
============================================================

Never expose:

Firebase Admin private key
Firebase service account
Supabase service-role key
Supabase secret key
SQL password
Google Apps Script secret
backend signing secret
admin passwords
superadmin passwords

Never put them in:

VITE_*
React
public/
localStorage
sessionStorage
URL parameters
GitHub

============================================================
ENVIRONMENT
============================================================

Frontend:

VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID

VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY

VITE_GOOGLE_PAYMENT_FORM_URL

Backend:

FIREBASE_ADMIN_PROJECT_ID
FIREBASE_ADMIN_CLIENT_EMAIL
FIREBASE_ADMIN_PRIVATE_KEY

SUPABASE_SERVICE_ROLE_KEY

SQL_CONNECT_* variables according to actual Firebase SQL
Connect configuration.

APPS_SCRIPT_URL
APPS_SCRIPT_SECRET

BACKEND_SESSION_SECRET

Do not invent SQL Connect environment variable names.

Inspect the actual SQL Connect integration first.

============================================================
CURRENT KNOWN PROBLEMS
============================================================

Fix:

1. Missing .env
2. Frontend-only authorization
3. Firebase Storage dependency for notes
4. Supabase layer not connected
5. Supabase Auth dependency
6. Google Sheets secret in URL
7. Payment → database bridge missing
8. Screenshot upload incomplete
9. Note-level access instead of bundle-level
10. Missing My Library
11. Student payment status mismatch
12. Broken download
13. Hardcoded Navbar login state
14. Figma SPA routing
15. Dead routes
16. Fake WhatsApp number
17. Stale credits/referral content
18. Mock/dead dashboard components
19. Incorrect Supabase/Auth copy
20. Missing backend token verification

============================================================
ENGINEERING METHOD
============================================================

Use:

Agile
+
Spiral Model
+
Incremental delivery

Every phase:

PLAN
↓
DISCOVER
↓
RISK ANALYSIS
↓
IMPLEMENT
↓
TEST
↓
SECURITY TEST
↓
BUILD
↓
REGRESSION TEST
↓
DOCUMENT
↓
NEXT PHASE

Never perform an uncontrolled rewrite.

============================================================
DEFINITION OF DONE
============================================================

Student:

[ ] Signup
[ ] Login
[ ] Profile
[ ] My Library
[ ] Authorized bundle
[ ] Secure note access

Admin:

[ ] Login
[ ] Dashboard
[ ] Student search
[ ] Payment verification
[ ] Bundle authorization
[ ] Note upload
[ ] Note deletion
[ ] Note management

Superadmin:

[ ] Admin management
[ ] User management
[ ] Role management
[ ] Configuration
[ ] Audit logs

Backend:

[ ] Firebase token verification
[ ] Role authorization
[ ] SQL Connect integration
[ ] Supabase PostgreSQL integration
[ ] Supabase Storage
[ ] Signed URLs
[ ] Synchronization
[ ] Retry handling
[ ] Idempotency
[ ] Audit logs

Security:

[ ] No service keys exposed
[ ] No private keys exposed
[ ] No passwords stored
[ ] No public paid files
[ ] No frontend-only authorization
[ ] Database rules enforced
[ ] RLS enforced where appropriate

Production:

[ ] Environment configuration
[ ] Typecheck
[ ] Lint
[ ] Tests
[ ] Build
[ ] Deployment
[ ] Error monitoring
[ ] Backup plan
[ ] 90-day SQL migration plan

============================================================
IMPORTANT
============================================================

Do not delete working functionality merely because it was created
by Figma AI.

First inspect.

Then classify each existing implementation:

KEEP
REFACTOR
REPLACE
REMOVE

Do not use Supabase Auth.

Do not use Firebase Storage for study materials.

Do not create duplicate authentication systems.

Do not expose secrets.

Do not claim "unhackable".

Build a secure system assuming the frontend can be inspected and
manipulated by a malicious user.

Start with an architecture/codebase audit.

Do not change code during the initial audit.

Return:

1. Current architecture
2. Target architecture
3. File-by-file changes
4. Database changes
5. Environment variables
6. Security risks
7. Migration strategy
8. Implementation phases
9. Tests required

Then wait for approval before destructive changes.