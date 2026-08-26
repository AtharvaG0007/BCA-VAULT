Build and integrate a complete Supabase backend for my existing BCA Vault website.

IMPORTANT:
Do NOT redesign or replace my existing frontend.
Keep the current UI, branding, colors, layout, pages and components unless a small change is required for Supabase integration.

TECH STACK:
- Existing frontend: React + Vite
- Backend/database: Supabase
- Database: PostgreSQL
- Storage: Supabase Storage
- Authentication: Supabase Auth
- Use @supabase/supabase-js

==================================================
1. SUPABASE CONNECTION
==================================================

Install:

@supabase/supabase-js

Create:

src/lib/supabase.js

Use environment variables:

VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY

Create a reusable Supabase client.

NEVER expose a Supabase secret/service-role key in frontend code.

==================================================
2. DATABASE STRUCTURE
==================================================

Create the following PostgreSQL tables.

TABLE: leads

Fields:
- id UUID primary key
- full_name TEXT
- email TEXT
- phone TEXT
- college TEXT
- roll_no TEXT
- division TEXT
- semester INTEGER
- bundle TEXT
- subjects TEXT[]
- source TEXT
- message TEXT
- status TEXT DEFAULT 'new'
- created_at TIMESTAMPTZ DEFAULT now()

This table will store students who submit the BCA Vault lead form.

--------------------------------------------------

TABLE: bundles

Fields:
- id UUID primary key
- name TEXT
- description TEXT
- price NUMERIC
- semester TEXT
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ DEFAULT now()

Example bundles:

Semester 1 – Complete Notes
Semester 2 – Complete Notes
Semester 1 + Semester 2 – Combo Bundle
All Semester Bundle
Individual Subject Notes

--------------------------------------------------

TABLE: courses

Fields:
- id UUID primary key
- name TEXT
- semester INTEGER
- description TEXT
- is_active BOOLEAN DEFAULT true
- created_at TIMESTAMPTZ DEFAULT now()

Example courses:

Semester 1:
- Fundamentals of IT
- C Programming

Semester 2:
- Web Development Technology
- DBMS I
- Data Structures using C

--------------------------------------------------

TABLE: notes

Fields:
- id UUID primary key
- course_id UUID REFERENCES courses(id)
- title TEXT
- description TEXT
- file_path TEXT
- file_type TEXT
- is_free BOOLEAN DEFAULT false
- created_at TIMESTAMPTZ DEFAULT now()

The database should store the FILE PATH, not the actual PDF file.

--------------------------------------------------

TABLE: orders

Fields:
- id UUID primary key
- lead_id UUID REFERENCES leads(id)
- bundle_id UUID REFERENCES bundles(id)
- amount NUMERIC
- payment_status TEXT DEFAULT 'pending'
- payment_reference TEXT
- payment_screenshot_path TEXT
- verified_at TIMESTAMPTZ
- created_at TIMESTAMPTZ DEFAULT now()

Possible payment statuses:

pending
submitted
verified
rejected
cancelled

--------------------------------------------------

TABLE: students

Fields:
- id UUID primary key
- auth_user_id UUID
- full_name TEXT
- email TEXT
- phone TEXT
- college TEXT
- roll_no TEXT
- division TEXT
- semester INTEGER
- created_at TIMESTAMPTZ DEFAULT now()

--------------------------------------------------

TABLE: enrollments

Fields:
- id UUID primary key
- student_id UUID REFERENCES students(id)
- bundle_id UUID REFERENCES bundles(id)
- status TEXT DEFAULT 'active'
- enrolled_at TIMESTAMPTZ DEFAULT now()

==================================================
3. STORAGE
==================================================

Create a PRIVATE Supabase Storage bucket:

bca-notes

Folder structure:

bca-notes/
    semester-1/
        fundamentals-of-it/
        c-programming/

    semester-2/
        web-development/
        dbms/
        data-structures/

Store PDF notes inside this bucket.

Do NOT make paid notes publicly accessible.

Also create a bucket for payment screenshots:

payment-screenshots

This bucket should also be private.

==================================================
4. ADMIN NOTE UPLOAD
==================================================

Create an admin interface where an authorized admin can:

- Select semester
- Select course
- Enter note title
- Enter description
- Select PDF
- Upload PDF to Supabase Storage
- Save the resulting storage path into the notes table

Example:

Course:
C Programming

Title:
Unit 1 – Introduction to Algorithm

File:
semester-1/c-programming/unit-1.pdf

The database should contain:

title:
Unit 1 – Introduction to Algorithm

course_id:
C Programming course ID

file_path:
semester-1/c-programming/unit-1.pdf

==================================================
5. STUDENT NOTE ACCESS
==================================================

Students should NOT receive permanent public PDF URLs.

When a student tries to open a paid note:

1. Check whether the user is authenticated.
2. Identify the student.
3. Check their enrollments.
4. Check whether their bundle gives access to the course/note.
5. If authorized, generate a temporary signed URL for the private PDF.
6. Open/download the PDF.
7. If unauthorized, show:

"🔒 This note is available with your BCA Vault bundle."

Do not expose Storage credentials or service-role keys to the browser.

==================================================
6. LEAD FORM
==================================================

Connect my existing BCA Vault lead form to Supabase.

Fields:

Full Name
Email Address
WhatsApp / Mobile Number
College / University
Roll Number
Division
Current Semester
BCA Vault Bundle
Interested Subjects
How did you hear about BCA Vault
Additional Message

When submitted:

1. Validate fields.
2. Save lead to Supabase `leads` table.
3. Show:

"Thank you! Your details have been submitted successfully. Our team will contact you on WhatsApp."

4. Prevent accidental duplicate submissions.

==================================================
7. ADMIN DASHBOARD
==================================================

Create/modify the existing admin dashboard to show:

TOTAL LEADS
TOTAL ORDERS
PENDING PAYMENTS
VERIFIED ORDERS
TOTAL STUDENTS
TOTAL ACTIVE BUNDLES

Lead table:

Name
Phone
Email
College
Roll No
Division
Semester
Bundle
Status
Date

Allow admin to:

- View lead
- Change lead status
- Search leads
- Filter by semester
- Filter by division
- Filter by bundle
- View order
- Verify/reject payment
- Create student access

==================================================
8. BUNDLE MANAGEMENT
==================================================

Admin should be able to:

- Create bundle
- Edit bundle
- Set price
- Set semester
- Activate/deactivate bundle
- View courses included in bundle

Example:

BCA Semester 1 Complete Notes
₹499

BCA Semester 2 Complete Notes
₹499

Semester 1 + 2 Combo
₹799

Do not hard-code prices throughout the frontend.
Read bundle information from Supabase.

==================================================
9. COURSE MANAGEMENT
==================================================

Admin should be able to:

- Add course
- Edit course
- Delete/deactivate course
- Assign semester
- Upload notes
- View number of notes

Example:

SEMESTER 1

Fundamentals of IT
C Programming

SEMESTER 2

Web Development Technology
DBMS I
Data Structures using C

==================================================
10. SECURITY / RLS
==================================================

Enable Row Level Security on all relevant tables.

Rules:

PUBLIC:
- Users can submit a lead through the lead form.
- Public users can see only active bundle/course information intended for the landing page.

STUDENT:
- Can view their own profile.
- Can view their own enrollments.
- Can access notes only when authorized.
- Cannot access another student's data.
- Cannot modify orders or payment verification status.

ADMIN:
- Can manage leads.
- Can manage bundles.
- Can manage courses.
- Can manage notes.
- Can manage orders.
- Can manage students.
- Can verify payments.

IMPORTANT:
Never solve security by exposing the Supabase service-role/secret key in frontend JavaScript.

==================================================
11. PAYMENT WORKFLOW
==================================================

Do NOT integrate a payment gateway at this stage.

Use this workflow:

Student
↓
Selects BCA Vault Bundle
↓
Submits lead
↓
Admin contacts student
↓
Student makes manual payment
↓
Student submits payment reference/screenshot
↓
Admin verifies payment
↓
Order becomes VERIFIED
↓
Student receives access
↓
Student can access purchased notes

==================================================
12. USER EXPERIENCE
==================================================

Keep the existing BCA Vault branding.

Use clear states:

Loading
Success
Error
Empty
Unauthorized
Payment Pending
Payment Verified
Access Granted
Access Denied

Use toast notifications where appropriate.

Do not reload the entire page unnecessarily.

Use proper loading states during:

- Database requests
- PDF uploads
- Authentication
- Payment verification

==================================================
13. ERROR HANDLING
==================================================

Handle:

- Supabase connection failure
- Database errors
- Storage upload errors
- Invalid PDF
- File too large
- Unauthorized access
- Missing course
- Missing note
- Expired signed URL
- Duplicate lead
- Invalid form data

Show simple user-friendly error messages.

Do not expose technical Supabase errors directly to students.

==================================================
14. FILE VALIDATION
==================================================

For note uploads:

Allowed:
- PDF

Validate:
- MIME type
- File extension
- File size

Show upload progress.

After upload:
1. Upload file to Storage.
2. Get storage path.
3. Insert note metadata into `notes`.
4. Show success message.

If database insertion fails after upload, handle the orphaned file appropriately.

==================================================
15. ENVIRONMENT VARIABLES
==================================================

Create/update:

.env.example

with:

VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

Do NOT create or commit:

SUPABASE_SERVICE_ROLE_KEY
SUPABASE_SECRET_KEY

Do not expose secret keys in frontend code.

==================================================
16. CODE QUALITY
==================================================

Use:

- Reusable components
- Reusable Supabase functions
- Clean folder structure
- Proper async/await
- Error handling
- Loading states
- Type-safe database operations where possible
- No unnecessary dependencies

Create reusable services such as:

src/services/leads.js
src/services/bundles.js
src/services/courses.js
src/services/notes.js
src/services/orders.js
src/services/storage.js

==================================================
17. FINAL TESTING
==================================================

After implementation, verify:

✓ Supabase connection works
✓ Lead form saves data
✓ Leads appear in admin dashboard
✓ Bundles load from database
✓ Courses load from database
✓ Admin can upload PDF
✓ PDF path is saved in notes table
✓ Private Storage works
✓ Unauthorized users cannot access paid notes
✓ Authorized students can access purchased notes
✓ Payment status updates correctly
✓ RLS policies prevent unauthorized access
✓ No secret/service-role key is exposed
✓ Existing BCA Vault UI still works

IMPORTANT:
First inspect my existing project structure and reuse the existing components and pages. Do not blindly create duplicate pages or duplicate Supabase clients.

Implement this incrementally and explain which files were changed.