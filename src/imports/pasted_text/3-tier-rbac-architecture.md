UPGRADE THE ENTIRE APPLICATION TO A TRUE ENTERPRISE-GRADE 3-TIER ROLE-BASED ARCHITECTURE.

IMPORTANT:

DO NOT create a single dashboard with hidden menu items.

DO NOT render all users inside the same dashboard layout.

CREATE THREE COMPLETELY SEPARATE DASHBOARD APPLICATIONS.

==================================================
ARCHITECTURE
============

Use:

* Firebase Authentication
* Firebase Realtime Database
* Next.js 15
* TypeScript
* Tailwind CSS
* Shadcn UI
* Vercel Deployment

==================================================
ROLE HIERARCHY
==============

ROLE 1

SUPER ADMIN

Route:

/superadmin

Dedicated Layout:

SuperAdminLayout

Dedicated Sidebar:

SuperAdminSidebar

Dedicated Dashboard:

SuperAdminDashboard

Capabilities:

* Manage entire platform
* Create Admins
* Create Members
* Edit all users
* Delete users
* Change roles
* Manage products
* Manage notes
* Manage PYQs
* Manage bundles
* Manage subscriptions
* Manage analytics
* Manage payments
* Manage website settings
* Manage Firebase settings
* Manage homepage content
* Access complete activity logs

==================================================
ROLE 2

ADMIN

Route:

/admin

Dedicated Layout:

AdminLayout

Dedicated Sidebar:

AdminSidebar

Dedicated Dashboard:

AdminDashboard

Capabilities:

* Manage assigned students
* Upload notes
* Upload PYQs
* Upload PDFs
* Upload bundles
* Create Member accounts
* Manage department reports
* Manage content

Restrictions:

* Cannot create Super Admin
* Cannot access platform settings
* Cannot access system analytics
* Cannot modify Firebase configuration
* Cannot delete Super Admin

==================================================
ROLE 3

MEMBER / STUDENT

Route:

/student

Dedicated Layout:

StudentLayout

Dedicated Sidebar:

StudentSidebar

Dedicated Dashboard:

StudentDashboard

Capabilities:

* View purchased content
* Download purchased notes
* View purchased bundles
* View PYQs
* Edit own profile
* Manage account settings

Restrictions:

* No user management
* No admin features
* No analytics
* No platform configuration

==================================================
ROUTING SYSTEM
==============

After login:

Fetch role from:

/users/{uid}/role

Redirect automatically:

superadmin
→ /superadmin

admin
→ /admin

member
→ /student

Never allow direct URL access.

Example:

If Member tries:

/admin

Redirect:

/student

If Admin tries:

/superadmin

Redirect:

/admin

==================================================
DATABASE STRUCTURE
==================

/users/{uid}
{
uid:"",
name:"",
email:"",
role:"",
status:"active",
createdAt:"",
createdBy:""
}

/roles
{
superadmin:{},
admin:{},
member:{}
}

/activityLogs/{logId}
{
userId:"",
action:"",
timestamp:"",
role:""
}

/products
{
}

/notes
{
}

/pyqs
{
}

/bundles
{
}

/orders
{
}

==================================================
PERMISSIONS SYSTEM
==================

Create RoleGuard Component.

<RoleGuard allowedRoles={["superadmin"]}>

<RoleGuard allowedRoles={["admin"]}>

<RoleGuard allowedRoles={["member"]}>

Verify role before page render.

Never trust frontend role.

Always verify role from Firebase Database.

==================================================
FIREBASE SECURITY RULES
=======================

Member:

Can read own profile only.

Admin:

Can read members created by them.

Super Admin:

Can read everything.

Prevent direct database manipulation.

Prevent privilege escalation.

Prevent users changing role manually.

Prevent editing another user's data.

==================================================
USER CREATION FLOW
==================

SUPER ADMIN

Can create:

* Admin
* Member

ADMIN

Can create:

* Member

MEMBER

Cannot create users.

==================================================
UI REQUIREMENTS
===============

SUPER ADMIN UI

Theme:

Professional Executive Dashboard

Cards:

* Total Users
* Total Revenue
* Total Orders
* Total Notes
* Total Bundles

Charts:

* Sales
* Registrations
* Downloads

==================================================

ADMIN UI

Theme:

Content Management Dashboard

Cards:

* Assigned Students
* Notes Uploaded
* Downloads
* Reports

==================================================

STUDENT UI

Theme:

Modern Learning Portal

Cards:

* Purchased Notes
* Active Bundles
* Download History
* Recommended Content

==================================================
ACTIVITY LOGGING
================

Log every action:

User Login

User Logout

User Created

User Deleted

Role Changed

Content Uploaded

Bundle Purchased

Profile Updated

Store inside:

/activityLogs

==================================================
CODE STRUCTURE
==============

src/

app/

(superadmin)

(admin)

(student)

components/

auth/

guards/

layouts/

dashboards/

services/

firebase/

hooks/

types/

utils/

==================================================
SECURITY
========

Use:

Protected Routes

Middleware

Role Verification

Firebase Rules

Server Side Validation

Input Sanitization

Rate Limiting

Audit Logs

Error Boundaries

Loading States

Session Validation

==================================================
FINAL REQUIREMENT
=================

Generate production-ready code.

Do not generate demo code.

Create three independent dashboard systems.

Each role must have a separate UI, separate navigation, separate layout, separate permissions, and separate route structure.

The system must be scalable to 100,000+ users.
