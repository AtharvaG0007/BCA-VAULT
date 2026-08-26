You are a Principal Software Engineer, Senior SaaS Architect, Supabase Expert, Product Designer, Figma AI Expert, and System Design Consultant.

I want to redesign my entire platform architecture.

IMPORTANT REQUIREMENTS

Replace Firebase completely with Supabase.

Remove:

* Firebase Authentication
* Firebase Realtime Database
* Firebase Storage

Replace with:

* Supabase Authentication
* Supabase PostgreSQL Database
* Supabase Storage
* Supabase Row Level Security (RLS)

========================================================

SUPABASE IMPLEMENTATION

Use:

Authentication:

* Email Login
* Email Signup
* Google Login
* Password Reset

Database:

* PostgreSQL

Storage:

* Notes
* PYQs
* PDFs
* Images
* User Uploads

Security:

* Row Level Security (RLS)
* Role-Based Access Control

========================================================

FILE STORAGE SYSTEM

Students should be able to upload:

* Notes
* PYQs
* PDFs
* Assignments
* Study Material

Store files in:

Supabase Storage Buckets

Buckets:

notes
pyqs
assignments
profile-images

Flow:

User Uploads PDF
↓
Supabase Storage
↓
File URL Generated
↓
Metadata Saved To Database
↓
Admin Approval
↓
Visible To Students

========================================================

USER DASHBOARD SYSTEM

Every registered user must automatically receive their own dashboard.

Routes:

/app/dashboard

Features:

Profile Information

* Name
* Email
* Branch
* Semester
* College

Purchased Packages

* Package Name
* Purchase Date
* Expiry Date
* Payment Status

Download Center

Users must be able to:

* Re-download purchased notes
* Re-download purchased PYQ packs
* Re-download premium content

Order History

Show:

* Invoice Number
* Payment Amount
* Date
* Status

Payment History

* Successful Payments
* Failed Payments
* Refunded Payments

Bookmarks

* Saved Notes
* Saved PYQs

Profile Settings

* Update Profile
* Change Password
* Manage Account

========================================================

PURCHASE FLOW

User purchases package
↓
Payment Success
↓
Order Stored In Database
↓
Package Added To User Account
↓
Available In Dashboard
↓
User Can Re-download Anytime

Create tables:

users
orders
payments
downloads
packages
notes
pyqs

========================================================

ADMIN PANEL SYSTEM

Create a completely separate Admin Portal.

Admin URL:

/admin

Admin Login:

/admin/login

Admin Dashboard:

/admin/dashboard

Admin Features:

* Manage Users
* Manage Notes
* Manage PYQs
* Manage Packages
* Manage Payments
* Approve Uploads
* View Analytics
* Manage Categories
* Manage Subscriptions
* Manage Storage

Admin should never use user dashboard routes.

========================================================

SUPER ADMIN PANEL

Create a separate platform owner dashboard.

URL:

/admin-root

Login:

/admin-root/login

Features:

* Create Admin Accounts
* Manage Admins
* Platform Analytics
* Revenue Dashboard
* Audit Logs
* Feature Flags
* Subscription Plans
* User Statistics
* Storage Monitoring

Only superadmin can access.

========================================================

HOW TO ACCESS ADMIN PANEL

Design a secure system.

Do NOT expose admin links in public navigation.

Admin Access Logic:

1. User logs in
2. System checks role
3. If role = member

Redirect:

/app/dashboard

4. If role = admin

Redirect:

/admin/dashboard

5. If role = superadmin

Redirect:

/admin-root/dashboard

Create role-based middleware and route guards.

========================================================

DATABASE DESIGN

users

* id
* email
* role
* branch
* semester
* created_at

notes

* id
* title
* subject
* file_url
* uploader_id
* status

pyqs

* id
* title
* year
* file_url
* uploader_id
* status

packages

* id
* title
* price
* description

orders

* id
* user_id
* package_id
* payment_id
* status

payments

* id
* user_id
* amount
* gateway
* status

downloads

* id
* user_id
* file_id
* downloaded_at

========================================================

FIGMA REQUIREMENTS

Create complete UI designs for:

Public Website

* Home
* Notes Marketplace
* PYQ Marketplace
* Pricing
* Login
* Signup

Student Dashboard

* Dashboard
* Downloads
* Orders
* Payments
* Profile

Admin Dashboard

* Analytics
* Notes Management
* PYQ Management
* User Management
* Package Management

Super Admin Dashboard

* Platform Overview
* Revenue
* Admin Management
* Audit Logs

========================================================

DELIVERABLES

Generate:

1. Complete PRD
2. Complete TRD
3. Database Schema
4. Supabase Architecture
5. RLS Policies
6. Folder Structure
7. Route Structure
8. Authentication Flow
9. Payment Flow
10. Admin Access Flow
11. User Dashboard Flow
12. Storage Architecture
13. Production Security Recommendations

Act as a senior SaaS engineering team and produce a production-ready architecture that can scale to 100,000+ students.
