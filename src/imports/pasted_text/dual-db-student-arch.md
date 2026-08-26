BCA VAULT — DUAL DATABASE STUDENT DATA ARCHITECTURE

IMPORTANT CHANGE:

I want student application data to be stored in BOTH:

1. Firebase SQL Connect
2. Supabase PostgreSQL

Firebase Authentication remains the authentication and identity
provider.

The same student must be represented in both databases using the
Firebase Authentication UID as the permanent identity bridge.

DO NOT create a second authentication system.

============================================================
1. FINAL ARCHITECTURE
============================================================

Student Signup
      ↓
Firebase Authentication
      ↓
Firebase UID
      ↓
      ├───────────────────────────┐
      ↓                           ↓
Firebase SQL Connect        Supabase PostgreSQL
Student record              Student record
      │                           │
      └──────── Firebase UID ─────┘

Actual study files:

Supabase Storage
        ↓
Private BCA Vault files

Firebase SQL Connect and Supabase PostgreSQL must both contain
student application data.

============================================================
2. FIREBASE AUTHENTICATION
============================================================

Firebase Authentication is the ONLY authentication provider.

It handles:

- Signup
- Login
- Password
- Password reset
- Email verification
- Firebase UID

NEVER store passwords in:

- SQL Connect
- Supabase
- Firebase Realtime Database
- localStorage
- frontend code

The Firebase UID is the permanent identity key.

============================================================
3. FIREBASE SQL CONNECT
============================================================

Firebase SQL Connect is one of the application's primary
relational databases.

Create:

users

Fields:

id UUID PRIMARY KEY
firebase_uid VARCHAR UNIQUE NOT NULL
email VARCHAR NOT NULL
full_name VARCHAR
phone VARCHAR
college_name VARCHAR
course VARCHAR
semester INTEGER
role VARCHAR
status VARCHAR
created_at TIMESTAMP
updated_at TIMESTAMP
last_login_at TIMESTAMP

Role:

student
admin
superadmin

Status:

active
suspended
disabled

The firebase_uid must be UNIQUE.

============================================================
4. SUPABASE POSTGRESQL
============================================================

Create a matching:

users

table in Supabase PostgreSQL.

Fields:

id UUID PRIMARY KEY
firebase_uid TEXT UNIQUE NOT NULL
email TEXT NOT NULL
full_name TEXT
phone TEXT
college_name TEXT
course TEXT
semester INTEGER
role TEXT
status TEXT
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
last_login_at TIMESTAMPTZ

The Supabase firebase_uid must correspond to the same Firebase
Authentication UID.

Example:

Firebase Authentication:

firebase_uid = abc123

Firebase SQL Connect:

firebase_uid = abc123

Supabase PostgreSQL:

firebase_uid = abc123

These records represent the SAME student.

============================================================
5. STUDENT REGISTRATION FLOW
============================================================

When a student registers:

Step 1:

Create Firebase Authentication account.

Firebase returns:

firebase_uid

Step 2:

Create student profile in Firebase SQL Connect.

Example:

users.firebase_uid = abc123

Step 3:

Create student profile in Supabase PostgreSQL.

Example:

users.firebase_uid = abc123

Step 4:

Return successful registration.

The frontend must NOT directly decide the firebase_uid.

The backend must derive the Firebase UID from the verified
Firebase Authentication token.

============================================================
6. STUDENT PROFILE SYNCHRONIZATION
============================================================

When student profile data changes:

Example:

Student changes:

full_name
phone
college
semester

the backend must synchronize the update to:

Firebase SQL Connect
AND
Supabase PostgreSQL

Use Firebase UID to find the corresponding record.

Do NOT match users only by email.

firebase_uid is the primary cross-system identity.

============================================================
7. DATA CONSISTENCY
============================================================

Implement a safe synchronization strategy.

Do NOT allow the frontend to independently modify the two
databases.

Use the backend as the synchronization layer.

Example:

Frontend
   ↓
Backend API
   ↓
Verify Firebase ID Token
   ↓
Get Firebase UID
   ↓
Validate request
   ↓
Update SQL Connect
   ↓
Update Supabase
   ↓
Return success

If one database update fails:

DO NOT report complete success.

Return a controlled error and log the synchronization failure.

============================================================
8. STUDENT DATA TO STORE IN BOTH DATABASES
============================================================

The following student profile information must exist in BOTH:

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

Optional:

last_login_at

Do NOT duplicate passwords.

Do NOT duplicate Firebase authentication credentials.

============================================================
9. BUNDLE DATA
============================================================

For BCA Vault:

BCA Vault — Complete Theory Bundle

Price:

₹899

The relational bundle data may exist in both databases if the
application requires both systems to query it.

However, avoid uncontrolled duplication.

If bundle data is synchronized into both systems, establish one
logical source of truth and synchronize changes through backend
operations.

Do NOT allow the frontend to independently edit bundle prices.

============================================================
10. STUDENT ACCESS DATA
============================================================

Student access should also be represented in both databases if
required by the application.

Example:

user_bundle_access

Fields:

id
firebase_uid
bundle_id
status
granted_at
granted_by
revoked_at
revoked_by
created_at
updated_at

Statuses:

active
revoked
expired

The same access record must reference the same Firebase UID.

============================================================
11. ORDERS
============================================================

Orders should be stored in:

Firebase SQL Connect
AND
Supabase PostgreSQL

Fields:

id
order_number
firebase_uid
bundle_id
original_amount
discount_amount
final_amount
currency
coupon_code
status
created_at
updated_at
approved_at
approved_by
rejected_at
rejected_by
rejection_reason

Use the same order ID in both databases.

This prevents duplicate order records.

============================================================
12. PAYMENTS
============================================================

Payment records should be stored in:

Firebase SQL Connect
AND
Supabase PostgreSQL

Fields:

id
order_id
firebase_uid
amount
currency
payment_method
transaction_id
utr_number
payment_screenshot_reference
status
submitted_at
verified_at
verified_by
rejection_reason

Use the same payment ID in both databases.

============================================================
13. MATERIALS
============================================================

Material metadata may be stored in both databases.

Actual files MUST ONLY be stored in:

Supabase Storage

Do NOT store PDF binaries in:

Firebase SQL Connect
Supabase PostgreSQL

Database stores:

material ID
title
semester
subject
unit
content type
file name
file size
storage bucket
storage path
status
uploaded_by
created_at

============================================================
14. SUPABASE STORAGE
============================================================

Use a PRIVATE bucket:

bca-vault-notes

Never make it public.

Actual files:

PDF
PYQ
PYQ Analysis
Most Repeated Questions
Important Questions

are stored in Supabase Storage.

Database stores only metadata and storage_path.

============================================================
15. ADMIN UPLOAD
============================================================

Admin:

Admin Panel
↓
Upload Note
↓
Backend verifies admin role
↓
Upload file to Supabase Storage
↓
Create material metadata in SQL Connect
↓
Create/synchronize material metadata in Supabase PostgreSQL
↓
Create audit log
↓
Success

If either database operation fails:

handle the failure.

If storage succeeds but database synchronization fails:

attempt cleanup and report the problem.

Do NOT create silent partial success.

============================================================
16. ADMIN DELETE
============================================================

Admin:

Delete Note
↓
Backend verifies admin
↓
Find material
↓
Delete Supabase Storage file
↓
Delete/soft-delete material metadata in SQL Connect
↓
Delete/soft-delete material metadata in Supabase
↓
Create audit log

============================================================
17. GOOGLE FORM PAYMENT
============================================================

Google Form collects:

Full Name
Phone
BCA Vault Registered Email
College
Course
Semester
Amount Paid
Coupon Code
UTR
Payment Screenshot

The form is NOT the database.

The admin verifies payment.

After verification:

Google Sheet
↓
Admin
↓
Backend
↓
SQL Connect payment/order update
↓
Supabase payment/order update
↓
Bundle access
↓
Student Library

============================================================
18. ADMIN APPROVAL
============================================================

When admin approves payment:

1. Verify Firebase UID
2. Verify student exists
3. Verify order
4. Verify payment
5. Verify amount
6. Verify coupon
7. Mark payment verified
8. Mark order approved
9. Create bundle access
10. Synchronize relevant records to both databases
11. Create audit log

The frontend must NEVER be able to approve its own payment.

============================================================
19. SECURITY
============================================================

NEVER trust these values from the browser:

firebase_uid
role
price
discount
final_amount
bundle access
payment status
admin status

The backend must derive:

firebase_uid

from the Firebase ID token.

The backend must determine:

role

from trusted server-side data.

============================================================
20. SUPABASE SECURITY
============================================================

Supabase PostgreSQL must use Row Level Security where appropriate.

Do not make all tables publicly readable.

The Supabase service-role key MUST remain backend-only.

Never expose:

SUPABASE_SERVICE_ROLE_KEY

to:

React
Vite
browser
localStorage
sessionStorage
GitHub

============================================================
21. FIREBASE SQL CONNECT SECURITY
============================================================

Do not expose database credentials to the frontend.

All privileged SQL Connect operations must occur through the
appropriate secure backend/server integration.

The browser must not receive database administrative credentials.

============================================================
22. FIREBASE REALTIME DATABASE
============================================================

Keep Firebase Realtime Database for:

users/{firebase_uid}

basic profile
role
status
authentication-related application state

Do not use it as the primary storage for PDFs.

Do not store study files there.

============================================================
23. ADMIN ROLES
============================================================

Admin:

/admin-login

/admin/dashboard

Superadmin:

/admin-root-login

/admin-root/dashboard

Student:

student role

Admin can:

- upload notes
- delete notes
- manage payments
- grant bundle access
- revoke bundle access

Superadmin can:

- manage admins
- manage roles
- manage system configuration
- view audit logs

Never hardcode admin passwords in frontend code.

============================================================
24. SYNCHRONIZATION STRATEGY
============================================================

Implement a reliable synchronization layer.

Every important shared entity should use the same ID in both
databases.

Example:

Student:

Firebase UID:
abc123

SQL user ID:
UUID-001

Supabase user ID:
UUID-001

firebase_uid:
abc123

For orders:

SQL order ID:
ORDER-001

Supabase order ID:
ORDER-001

For payments:

SQL payment ID:
PAYMENT-001

Supabase payment ID:
PAYMENT-001

For materials:

SQL material ID:
MATERIAL-001

Supabase material ID:
MATERIAL-001

Do not generate unrelated IDs for the same logical record.

============================================================
25. SYNC STATUS
============================================================

For records synchronized between the databases, optionally
maintain:

sync_status

Possible values:

synced
pending
failed

and:

last_synced_at

If a synchronization fails, record the failure and retry safely.

Do NOT create duplicate records during retries.

Use idempotent operations.

============================================================
26. IDEMPOTENCY
============================================================

Registration:

Same Firebase UID must not create duplicate users.

Order creation:

Same idempotency key must not create duplicate orders.

Payment:

Same transaction/UTR should not create duplicate verified
payments.

Material upload:

Same material ID must not create duplicate metadata.

============================================================
27. AUDIT LOG
============================================================

Store administrative actions in both systems if required.

Actions:

LOGIN
LOGOUT
USER_CREATED
USER_UPDATED
ROLE_CHANGED
MATERIAL_UPLOADED
MATERIAL_DELETED
ORDER_CREATED
PAYMENT_SUBMITTED
PAYMENT_VERIFIED
PAYMENT_REJECTED
ACCESS_GRANTED
ACCESS_REVOKED

Never store passwords or private keys.

============================================================
28. 90-DAY FIREBASE SQL CONNECT PERIOD
============================================================

Firebase SQL Connect is currently being used for approximately
90 days.

Therefore:

Keep the SQL schema portable.

Use:

UUID identifiers
standard relational tables
foreign keys
indexes
constraints

Do not build business logic that cannot later be migrated.

Create:

/docs/90-DAY-MIGRATION-PLAN.md

The migration plan must explain how data can be moved from
Firebase SQL Connect to another PostgreSQL-compatible database
later without changing Firebase Authentication.

Firebase UID must remain the permanent identity bridge.

============================================================
29. FAILURE HANDLING
============================================================

Example:

SQL Connect succeeds
Supabase fails

Do NOT tell the frontend that synchronization completed.

Mark:

sync_status = failed

and log the failure.

Then retry safely.

Example:

Supabase succeeds
SQL Connect fails

Same behavior.

Avoid half-created records.

============================================================
30. TESTING
============================================================

Test:

Student registration
→ Firebase Auth
→ Firebase UID
→ SQL Connect user
→ Supabase user

Student profile update
→ SQL Connect updated
→ Supabase updated

Admin upload
→ Supabase Storage
→ SQL material
→ Supabase material

Admin delete
→ Supabase Storage deleted
→ SQL metadata deleted
→ Supabase metadata deleted

Payment approval
→ SQL order/payment
→ Supabase order/payment
→ Bundle access

Access revocation
→ SQL access revoked
→ Supabase access revoked

Security:

Student cannot modify role.

Student cannot approve payment.

Student cannot access admin API.

Student cannot access another student's data.

Student cannot access unauthorized notes.

Admin cannot become superadmin.

Supabase service-role key is not exposed.

Firebase service-account credentials are not exposed.

============================================================
31. FINAL DATA ARCHITECTURE
============================================================

The final architecture must be:

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
          ┌────────────────┼────────────────┐
          |                |                |
          ↓                ↓                ↓
    Firebase RTDB     Firebase SQL      Supabase
                      Connect            PostgreSQL
          |                |                |
     profile/role      business data      synchronized
     status            relational        application data
                           |                |
                           |                ↓
                           |          Supabase Storage
                           |           PRIVATE BUCKET
                           |                |
                           └────────────────┘
                                    |
                              Secure access
                                    |
                                  Student

============================================================
32. FINAL REQUIREMENT
============================================================

The student data MUST exist in BOTH:

Firebase SQL Connect
AND
Supabase PostgreSQL

and both records MUST be linked using:

firebase_uid

The actual files MUST exist in:

Supabase Storage

Firebase Authentication remains responsible for identity and
passwords.

Do not expose any secret credentials on the frontend.

Do not claim production readiness until:

- both database connections work
- synchronization works
- authentication works
- authorization works
- Supabase Storage is private
- admin operations work
- student access works
- failure/retry handling works
- security tests pass
- production build passes

First inspect the existing project and identify the current
Firebase, SQL Connect and Supabase implementations.

Do not perform a destructive rewrite.