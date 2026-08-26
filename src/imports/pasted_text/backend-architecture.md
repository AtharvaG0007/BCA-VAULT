BCA VAULT — FINAL BACKEND ARCHITECTURE

IMPORTANT: FOLLOW THIS ARCHITECTURE.

I DO NOT WANT SUPABASE AUTHENTICATION.

Firebase Authentication MUST remain the ONLY authentication
provider for the entire BCA Vault application.

I have Firebase SQL Connect available for approximately 90 days.

I want to use that period, but I DO NOT want my application data
to depend permanently on Firebase SQL Connect.

Supabase must become the permanent database and storage layer.

Therefore implement a dual-database architecture with automatic
synchronization.

============================================================
AUTHENTICATION
============================================================

Firebase Authentication is the permanent identity provider.

Use Firebase Auth for:

- Signup
- Login
- Password
- Password reset
- Email verification
- Firebase UID

DO NOT use:

Supabase Auth

Do not add Supabase login/signup.

Do not create a second authentication system.

Firebase UID is the permanent identity key.

============================================================
DATABASE STRATEGY
============================================================

For the first 90 days:

Firebase SQL Connect
+
Supabase PostgreSQL

Both contain synchronized application data.

After the Firebase SQL Connect period ends:

Firebase SQL Connect is removed.

Supabase PostgreSQL becomes the primary application database.

Firebase Authentication continues permanently.

The application must be designed so that removing SQL Connect
does NOT affect:

- student accounts
- passwords
- Firebase UIDs
- notes
- payments
- bundles
- access permissions
- student history

============================================================
PERMANENT ARCHITECTURE
============================================================

React/Vite
    ↓
Firebase Authentication
    ↓
Firebase UID
    ↓
Secure Backend API
    ↓
Supabase PostgreSQL
    ↓
Supabase Storage

Firebase SQL Connect is a temporary synchronized database
during the first 90 days.

============================================================
STUDENT REGISTRATION
============================================================

When a student registers:

1. Create Firebase Authentication account.
2. Firebase generates UID.
3. Backend verifies Firebase user.
4. Create student record in Firebase SQL Connect.
5. Create student record in Supabase PostgreSQL.
6. Use the SAME Firebase UID in both databases.
7. Return successful registration.

Example:

Firebase UID:

abc123

SQL Connect:

firebase_uid = abc123

Supabase:

firebase_uid = abc123

Never create different identities for the same student.

============================================================
STUDENT PROFILE
============================================================

Store the following in BOTH databases:

firebase_uid
email
full_name
phone
college_name
course
semester
role
status
created_at
updated_at

Firebase Auth remains authoritative for:

email
password
authentication identity

Do not store passwords in either database.

============================================================
PROFILE UPDATE
============================================================

Student changes:

name
phone
college
semester

Frontend sends request to backend.

Backend:

1. Verify Firebase ID token.
2. Get Firebase UID.
3. Validate request.
4. Update SQL Connect.
5. Update Supabase.
6. Return success only when synchronization succeeds.

If one database fails:

Do NOT silently report success.

Record:

sync_status = failed

and provide retry/recovery handling.

============================================================
SYNC ARCHITECTURE
============================================================

Create a synchronization service.

Example:

syncStudentProfile(firebaseUid)

syncOrder(orderId)

syncPayment(paymentId)

syncBundleAccess(accessId)

syncMaterial(materialId)

Operations must be idempotent.

Running the same synchronization twice must NOT create duplicate
records.

Use stable UUIDs and Firebase UID references.

============================================================
SUPABASE POSTGRESQL
============================================================

Supabase PostgreSQL is the permanent database.

Create:

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

Use Firebase UID as the cross-system identity.

Example:

users.firebase_uid

must be UNIQUE.

============================================================
FIREBASE SQL CONNECT
============================================================

Firebase SQL Connect is temporary.

During the first 90 days:

Synchronize important application data to SQL Connect.

Do NOT make SQL Connect the only copy of the data.

Do NOT store anything in SQL Connect that does not also have a
migration/synchronization strategy to Supabase.

Create:

/docs/SQL-CONNECT-MIGRATION.md

Document:

- Current SQL schema
- Supabase schema
- Mapping between tables
- Shared IDs
- Firebase UID mapping
- Synchronization process
- Failure recovery
- Final SQL Connect shutdown process

============================================================
SUPABASE STORAGE
============================================================

Supabase Storage is the permanent file storage provider.

Use a PRIVATE bucket:

bca-vault-notes

Store:

PDF notes
PYQs
PYQ analysis
Most repeated questions
Important questions

Do NOT use Firebase Storage.

Do NOT store PDFs in SQL Connect.

Do NOT store PDFs in PostgreSQL.

Store only metadata in the databases.

Example:

material_id
title
semester
subject
unit
storage_provider
storage_bucket
storage_path
file_name
file_size
status
uploaded_by
created_at

============================================================
ADMIN UPLOAD
============================================================

Admin:

Admin Dashboard
↓
Upload Note
↓
Backend verifies Firebase ID token
↓
Backend verifies admin role
↓
Upload file to private Supabase Storage
↓
Create material metadata in Supabase
↓
Synchronize material metadata to SQL Connect
↓
Audit log
↓
Success

If SQL Connect fails:

The Supabase record remains the permanent source.

Create a synchronization retry record.

Do not delete a successfully uploaded permanent file merely
because temporary SQL Connect synchronization failed.

============================================================
ADMIN DELETE
============================================================

Admin:

Delete Note
↓
Verify Firebase identity
↓
Verify admin role
↓
Delete file from Supabase Storage
↓
Delete/soft-delete Supabase material
↓
Synchronize SQL Connect
↓
Audit log

============================================================
STUDENT ACCESS
============================================================

Student:

Firebase login
↓
Firebase ID token
↓
Backend
↓
Verify Firebase UID
↓
Query Supabase user
↓
Check user_bundle_access
↓
Check material
↓
Generate short-lived Supabase signed URL
↓
Student reads material

Do NOT expose permanent public URLs.

============================================================
ADMIN AUTHORIZATION
============================================================

Admin:

Firebase Authentication
↓
Firebase UID
↓
Backend verifies token
↓
Backend reads trusted role
↓
Admin operation

Student must never be able to:

- change role
- grant access
- approve payment
- upload notes
- delete notes
- modify price
- modify discount
- access another user's data

Never rely only on frontend route protection.

============================================================
ROLES
============================================================

student
admin
superadmin

Firebase Auth is the identity.

Database contains role.

Do NOT use Supabase Auth.

============================================================
PAYMENTS
============================================================

Google Form remains the payment collection mechanism.

Student:

UPI payment
↓
Google Form
↓
Payment screenshot
↓
UTR
↓
Registered Firebase email

Admin:

Verify payment
↓
Approve
↓
Create bundle access
↓
Synchronize SQL Connect
↓
Synchronize Supabase

Google Sheet is NOT the source of truth.

The application database is the source of truth.

============================================================
BUNDLE
============================================================

One product:

BCA Vault — Complete Theory Bundle

₹899

Includes:

Theory Notes
PYQs
PYQ Analysis
Most Repeated Questions
Important Exam Topics

Excludes:

Mathematics
Labs
Practicals
Projects

============================================================
90-DAY MIGRATION
============================================================

The application must support:

PHASE A — Days 1–90

Firebase Auth
+
Firebase SQL Connect
+
Supabase PostgreSQL
+
Supabase Storage

PHASE B — After SQL Connect expires

Firebase Auth
+
Supabase PostgreSQL
+
Supabase Storage

The frontend should NOT need to be rewritten when SQL Connect
is removed.

All business operations should use a backend repository/service
layer.

Example:

UserRepository
OrderRepository
PaymentRepository
BundleRepository
MaterialRepository
AccessRepository

During 90 days:

Repository can synchronize SQL Connect + Supabase.

After 90 days:

Repository uses Supabase only.

The React frontend should not directly depend on SQL Connect.

============================================================
CRITICAL SECURITY
============================================================

NEVER expose:

Firebase Admin SDK credentials
Firebase service account private key
Supabase service-role key
Supabase secret key
database passwords
backend secrets
admin passwords

Never put secrets inside:

src/
React
Vite frontend
VITE_ environment variables
localStorage
sessionStorage
URL parameters

Firebase web configuration may be used by the browser where
required by Firebase Web SDK.

Privileged credentials must remain backend-only.

============================================================
FAILURE HANDLING
============================================================

If:

Supabase succeeds
SQL Connect fails

DO NOT rollback the permanent Supabase data automatically.

Mark synchronization:

pending
or
failed

and retry.

If:

SQL Connect succeeds
Supabase fails

Retry Supabase synchronization.

Supabase is the permanent target.

Use idempotent operations.

Never create duplicate records during retry.

============================================================
DATABASE MIGRATION
============================================================

Create:

/docs/SQL-CONNECT-MIGRATION.md

Include a final migration procedure:

1. Stop writes briefly or enter maintenance mode.
2. Verify all SQL Connect records exist in Supabase.
3. Compare record counts.
4. Compare checksums/critical fields.
5. Resolve synchronization failures.
6. Perform final synchronization.
7. Run integrity checks.
8. Switch backend repository to Supabase-only.
9. Disable SQL Connect writes.
10. Keep SQL Connect read-only temporarily if available.
11. Monitor production.
12. Remove SQL Connect dependency only after validation.

Do NOT migrate Firebase Authentication.

Firebase Auth continues unchanged.

============================================================
TESTING
============================================================

Test:

Student signup
→ Firebase Auth
→ SQL Connect
→ Supabase

Student profile update
→ both databases

Admin upload
→ Supabase Storage
→ Supabase DB
→ SQL Connect

Admin delete
→ Supabase Storage
→ Supabase DB
→ SQL Connect

Payment approval
→ Supabase
→ SQL Connect

Bundle access
→ Supabase
→ SQL Connect

Student material access
→ Firebase Auth
→ Supabase authorization
→ signed URL

Then test SQL Connect failure.

The application should continue functioning from Supabase
where possible and create a synchronization retry.

============================================================
FINAL GOAL
============================================================

I want this final production architecture:

                BCA VAULT
                    |
              React / Vite
                    |
              Firebase Auth
                    |
               Firebase UID
                    |
              Secure Backend
                    |
             Supabase PostgreSQL
                    |
             Supabase Storage
                    |
             Private PDF/Notes

During the first 90 days:

                    |
             Firebase SQL Connect
                    |
             Synchronized copy

After 90 days:

Remove SQL Connect.

Nothing changes for students.

Firebase Auth continues.

Supabase PostgreSQL continues.

Supabase Storage continues.

All student data, orders, payments, access records and material
metadata must already exist in Supabase before the SQL Connect
period ends.

DO NOT use Supabase Authentication.

DO NOT use Firebase Storage.

DO NOT make Supabase Storage public.

DO NOT expose secrets.

Do not perform a destructive rewrite.

First inspect the current repository and report which existing
files/services need to be modified to implement this architecture.
Then implement incrementally.