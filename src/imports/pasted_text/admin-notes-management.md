BCA VAULT — ADMIN NOTES MANAGEMENT + SUPABASE STORAGE

Act as a senior full-stack engineer.

For this iteration, implement ONLY the Admin Notes Management system.

Do NOT redesign the whole application.
Do NOT modify authentication unnecessarily.
Do NOT modify the payment system.
Do NOT modify the existing bundle pricing.
Do NOT modify the syllabus unless required for note categorization.

The goal is:

ADMIN PANEL
    ↓
Upload Note
    ↓
Supabase PRIVATE Storage
    ↓
Store note metadata
    ↓
Display note in Admin Panel
    ↓
Student can later access it only through authorization

Also implement:

Admin
    ↓
Select Note
    ↓
Delete Note
    ↓
Delete database metadata
    ↓
Delete Supabase storage file

==================================================
1. FIRST INSPECT THE EXISTING PROJECT
==================================================

Before changing code, inspect:

- AdminDashboard
- AdminPage
- NotesPage
- BundlesPage
- Firebase configuration
- Firebase Realtime Database helpers
- existing Supabase folder
- Supabase client
- Supabase types
- existing material/note schema
- existing bundle schema
- existing role protection
- environment variables
- package.json

Search for:

supabase
createClient
storage
upload
remove
notes
materials
bundles
AdminDashboard
AdminPage
role
admin
superadmin

There is already a Supabase layer in the project. Determine whether it can safely be activated or needs correction.

Do NOT create duplicate Supabase clients if one already exists.

==================================================
2. STORAGE ARCHITECTURE
==================================================

Use:

SUPABASE STORAGE = actual note files

FIREBASE REALTIME DATABASE = note metadata

Do NOT store PDF/file binaries in Firebase Realtime Database.

Do NOT use Firebase Storage for new study notes.

Use a PRIVATE Supabase Storage bucket.

Recommended bucket:

bca-vault-notes

The bucket MUST NOT be public.

Do not create public URLs for paid notes.

==================================================
3. SUPABASE ENVIRONMENT VARIABLES
==================================================

Use environment variables.

Frontend may use only the Supabase public/publishable key if the architecture requires it.

NEVER expose:

- Supabase service-role key
- Supabase secret key
- database password
- backend private key

Do NOT put secret/service-role credentials inside:

- React components
- .tsx files
- Git
- localStorage
- sessionStorage
- URL parameters

If the existing architecture requires service-role access for privileged operations, create a secure backend/server-side operation.

Create/update:

.env.example

but DO NOT put real credentials into it.

Use placeholders such as:

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

and server-side variables only where required.

==================================================
4. ADMIN NOTES SECTION
==================================================

Add a dedicated section/tab inside the existing Admin Dashboard:

Notes / Materials

Example:

Admin Dashboard

├── Dashboard
├── Students
├── Payments
├── Bundles
├── Notes / Materials   ← NEW
├── Access Management
└── Audit Logs

Do not create a separate unrelated admin application.

==================================================
5. NOTES MANAGEMENT UI
==================================================

Create a clean admin interface:

--------------------------------------------

NOTES / MATERIALS

[ + Upload Note ]

Search notes...

Filter:
Semester
Subject
Type
Status

--------------------------------------------

Existing notes:

Title
Subject
Semester
Type
File
Uploaded
Status
Actions

[View] [Delete]

--------------------------------------------

==================================================
6. UPLOAD NOTE FORM
==================================================

When admin clicks:

+ Upload Note

open a professional upload form/modal.

Fields:

1. Note Title
2. Description
3. Semester
4. Subject
5. Unit
6. Content Type
7. File
8. Published / Draft

Semester options:

Semester 1
Semester 2
Semester 3
Semester 4
Semester 5
Semester 6
Semester 7
Semester 8

For the current BCA Vault launch, only Semester 1 and Semester 2
should be active/available.

Content Type:

Theory Notes
PYQ
Most Repeated Questions
Important Questions

Do NOT add:

Maths
Lab
Practical
Project

as content types.

==================================================
7. FILE TYPES
==================================================

For the first version, support:

PDF

Optionally allow:

PNG
JPG
JPEG

if the existing viewer supports them.

Maximum file size should be configurable.

Do not silently accept dangerous executable files.

Reject:

.exe
.bat
.cmd
.js
.html
.svg with unsafe content
.zip unless explicitly supported
etc.

The first production version should preferably be PDF-only.

==================================================
8. FILE NAME / STORAGE PATH
==================================================

Do not use the original user filename as an unrestricted storage path.

Generate a safe unique storage name.

Example:

UUID.pdf

Recommended structure:

bca-vault-notes/
2026-27/
semester-1/
subject-slug/
unit-slug/
UUID.pdf

Example:

2026-27/
semester-1/
foundations-of-computing/
unit-1/
550e8400-e29b-41d4-a716-446655440000.pdf

Avoid path traversal and unsafe filenames.

==================================================
9. UPLOAD FLOW
==================================================

Implement:

Admin selects file
        ↓
Frontend validates file
        ↓
Admin authorization checked
        ↓
Upload file to PRIVATE Supabase bucket
        ↓
Supabase returns storage path
        ↓
Create note metadata record
        ↓
Show success
        ↓
Refresh Notes list

IMPORTANT:

Do NOT create the database record before a successful file upload.

If metadata creation fails after file upload:

attempt to delete the uploaded file.

Do not leave orphaned files.

==================================================
10. NOTE METADATA
==================================================

Store metadata in the existing Firebase Realtime Database
notes/materials structure if that is the current production data
model.

Do not create duplicate competing schemas.

Recommended schema:

notes/{noteId}

{
  id,
  title,
  description,
  semester,
  subject,
  unit,
  contentType,
  fileName,
  fileType,
  fileSize,
  storageProvider: "supabase",
  storageBucket: "bca-vault-notes",
  storagePath,
  published,
  createdAt,
  updatedAt,
  uploadedBy
}

IMPORTANT:

Store ONLY the storage path/reference.

Do NOT store a permanent public Supabase URL.

Example:

storagePath:
2026-27/semester-1/foundations-of-computing/unit-1/UUID.pdf

NOT:

https://....supabase.co/storage/v1/object/public/....

==================================================
11. ADMIN NOTE LIST
==================================================

After uploading, show the note immediately.

Example:

------------------------------------------------

📘 Introduction to Computers

Semester 1
Foundations of Computing
Unit 1
Theory Notes

Uploaded:
22 Aug 2026

Status:
Published

[View] [Delete]

------------------------------------------------

Provide:

Search
Filtering
Sorting

At minimum:

Search by title
Filter by semester
Filter by subject
Filter by content type

==================================================
12. VIEW NOTE
==================================================

For admin only, create:

[View]

The admin should be able to preview/download the file through
a controlled server-side/signed access mechanism.

Do NOT make the Supabase bucket public just to make the View
button work.

If a signed URL is required:

Admin request
    ↓
Backend verifies admin
    ↓
Generate short-lived signed URL
    ↓
Return URL
    ↓
Open/preview file

Keep the URL short-lived.

==================================================
13. DELETE NOTE
==================================================

Implement:

[Delete]

Before deletion show:

Delete this note?

Title:
__________

This will permanently remove the stored file and its metadata.

[Cancel] [Delete Permanently]

When confirmed:

1. Verify admin authorization.
2. Read storagePath.
3. Delete the file from Supabase Storage.
4. Delete the Firebase note metadata.
5. Create an audit log.

IMPORTANT:

Do not delete only the database record.

Do not delete only the Supabase file.

Both must be handled.

==================================================
14. DELETE FAILURE HANDLING
==================================================

Handle partial failures safely.

Example:

Supabase deletion succeeds
Firebase deletion fails

Do not pretend deletion succeeded.

Show:

"File removed, but metadata cleanup failed."

Log the failure.

If Firebase deletion succeeds but Supabase deletion fails:

Do not silently report success.

Record the orphaned storage path and surface an admin warning.

Never hide backend failures.

==================================================
15. ADMIN AUTHORIZATION
==================================================

Only:

admin
superadmin

may upload/delete notes.

member/student:

NO upload
NO delete
NO admin access

Do not rely only on hiding the button.

The backend/database/storage authorization must enforce this.

Frontend:

ProtectedRoute

is NOT enough by itself.

==================================================
16. SUPABASE STORAGE SECURITY
==================================================

The bucket MUST remain private.

Do NOT configure:

public = true

Do NOT expose permanent public URLs.

Do NOT give students direct unrestricted bucket access.

Students should eventually access a note like:

Student
 ↓
Firebase Auth
 ↓
Check userAccess
 ↓
Check bundle
 ↓
Check note belongs to bundle
 ↓
Backend
 ↓
Generate short-lived signed URL
 ↓
Student viewer

For this iteration, implement the storage architecture so it
can be used by the existing student access system later.

==================================================
17. BUNDLE RELATIONSHIP
==================================================

Because BCA Vault has ONE product:

BCA Vault — Complete Theory Bundle

notes should be associated with the relevant subject/content
structure.

Do NOT create separate paid products for every subject.

Recommended relationship:

Bundle
 ↓
Semester
 ↓
Subject
 ↓
Unit
 ↓
Note

The note should be discoverable from:

Complete Theory Bundle
→ Semester
→ Subject
→ Unit
→ Note

==================================================
18. CURRENT SYLLABUS
==================================================

Use the existing 2026–27 syllabus data.

Currently available:

Semester 1
Semester 2

Semester 3–8:

Coming Soon

Do not upload or expose old syllabus material.

Theory-focused only.

Exclude:

Mathematics
Labs
Practicals
Projects

==================================================
19. AUDIT LOGGING
==================================================

Whenever an admin uploads a note:

Create audit log:

NOTE_UPLOADED

Include:

actorUid
actorRole
noteId
timestamp
metadata

Whenever an admin deletes:

NOTE_DELETED

Include:

actorUid
actorRole
noteId
timestamp
storagePath reference

Do NOT log secrets.

==================================================
20. FILE ACCESS SECURITY
==================================================

Never trust:

noteId from frontend
uid from frontend
role from frontend

Always determine authenticated identity server-side/backend-side
where applicable.

The user identity must come from Firebase Authentication.

Do not allow a student to modify:

uploadedBy
storagePath
owner
role
bundle access

from the client.

==================================================
21. UI/UX
==================================================

Match the existing BCA Vault design.

Use:

- clean dashboard cards
- professional tables
- responsive design
- drag-and-drop upload area
- upload progress
- file validation messages
- success/error notifications
- confirmation dialog for deletion
- loading states
- empty states
- mobile-friendly layout

Upload area:

"Drag & drop your PDF here"

or:

"Choose File"

Show:

Filename
File size
Upload progress
Upload status

==================================================
22. ERROR HANDLING
==================================================

Handle:

- Supabase unavailable
- Firebase unavailable
- Invalid file
- File too large
- Upload failure
- Metadata failure
- Delete failure
- Unauthorized admin
- Expired session
- Network interruption

Never silently swallow errors.

Never use fake success messages.

==================================================
23. TESTING
==================================================

After implementation test:

TEST 1:
Admin uploads PDF
→ Supabase file exists
→ Firebase metadata exists

TEST 2:
Admin refreshes dashboard
→ note still appears

TEST 3:
Admin views note
→ controlled access works

TEST 4:
Admin deletes note
→ Supabase file removed
→ Firebase metadata removed

TEST 5:
Student tries upload
→ rejected

TEST 6:
Student tries delete
→ rejected

TEST 7:
Unauthorized user attempts direct storage access
→ rejected

TEST 8:
Invalid file upload
→ rejected

TEST 9:
Large file
→ rejected

TEST 10:
Upload succeeds but metadata fails
→ no orphan file if cleanup succeeds

TEST 11:
Delete file succeeds but metadata fails
→ system reports partial failure

TEST 12:
Refresh / logout / login
→ uploaded notes remain correctly listed

==================================================
24. BUILD AND QA
==================================================

Run the actual project commands from package.json.

At minimum, run where available:

npm run lint
npm run typecheck
npm run build
npm test

Do not claim tests passed unless they actually passed.

Fix all errors introduced by this implementation.

Do not modify unrelated features.

==================================================
25. SECURITY CHECK
==================================================

Before completing this task, search the project for:

SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET
service_role
privateKey
client_secret
password
adminPassword

If any secret is found in frontend code:

STOP and report it.

Do not print the secret value.

Move privileged operations to a secure backend/server-side
implementation.

==================================================
26. FINAL REPORT
==================================================

At the end, report:

1. Files changed
2. Supabase bucket used
3. Database metadata structure
4. Upload flow
5. Delete flow
6. Authorization flow
7. Security controls
8. Tests executed
9. Tests passed
10. Tests failed
11. Remaining backend configuration required

Do not say "production ready" unless the required Supabase,
Firebase, environment and security configuration is actually
verified.

IMPORTANT:

This iteration is ONLY:

ADMIN NOTE UPLOAD
+
SUPABASE PRIVATE STORAGE
+
NOTE METADATA
+
ADMIN DELETE
+
SECURITY
+
TESTING

Do not redesign the rest of BCA Vault.