You are a Principal Software Engineer, Firebase Architect, Staff React Engineer, System Design Expert, and Security Auditor.

I want you to perform a complete codebase audit and architecture redesign for my React + TypeScript + Firebase SaaS application.

Current Stack:

* React
* TypeScript
* Vite
* React Router
* Firebase Authentication
* Firebase Realtime Database
* Context API
* RBAC (Role Based Access Control)

Current Roles:

* superadmin
* admin
* member

Current Problems:

1. Login succeeds.
2. Firebase Authentication succeeds.
3. Success message appears.
4. Student is not redirected correctly.
5. Admin panel login is not working.
6. Role-based routing is broken.
7. Possible race conditions.
8. User role may be loading asynchronously.
9. Dashboard redirects are inconsistent.
10. Admin, Superadmin and Member currently share parts of the same application flow.

========================================================

OBJECTIVE

I want a complete production-grade architecture review.

I want all users separated into isolated application branches.

The architecture should be redesigned into:

SUPERADMIN BRANCH

/admin-root

Responsible for:

* Platform Management
* Global Analytics
* User Management
* Subscription Management
* Feature Flags
* Platform Settings
* Audit Logs
* System Monitoring
* Revenue Dashboard
* Admin Creation
* Society Creation
* Role Management

ADMIN BRANCH

/admin

Responsible for:

* Society Management
* Staff Management
* Vendor Management
* Complaints
* Finance
* Maintenance
* Reports
* Residents

MEMBER BRANCH

/app

Responsible for:

* Dashboard
* Complaints
* Payments
* Notices
* Community
* Profile
* Visitor Requests

No branch should share routes.

No branch should share layouts.

No branch should share navigation.

Each branch must have its own:

* Layout
* Sidebar
* Dashboard
* Protected Routes
* Context
* Navigation

========================================================

ARCHITECTURE REQUIREMENTS

Convert the application into a proper 3-Tier Architecture.

PRESENTATION LAYER

Frontend

React
TypeScript
Role-based UI

APPLICATION LAYER

Business Logic

Authentication
Authorization
RBAC
Validation
Services
Controllers

DATA LAYER

Firebase
MongoDB
Storage
Repositories

========================================================

AUTHENTICATION FLOW

Analyze:

* LoginPage.tsx
* SignupPage.tsx
* AuthContext.tsx
* ProtectedRoute.tsx
* RoleRedirect.tsx
* Firebase Config
* getUserById()
* User Creation Flow

Verify:

1. User exists in Firebase Auth
2. User exists in Database
3. Role exists
4. Role loads correctly
5. Role persists after refresh
6. Redirect happens after role load
7. No race conditions
8. No navigation loops

========================================================

ROUTING STRUCTURE

Design:

Public Routes

/
/login
/signup
/forgot-password

Member Routes

/app/dashboard
/app/profile
/app/payments
/app/complaints

Admin Routes

/admin/dashboard
/admin/residents
/admin/vendors
/admin/finance

Superadmin Routes

/admin-root/dashboard
/admin-root/users
/admin-root/roles
/admin-root/subscriptions

========================================================

SECURITY AUDIT

Audit:

Firebase Rules
Authentication
Authorization
Session Handling
Route Protection
Role Escalation Risks
Privilege Escalation
Broken Access Control
IDOR Vulnerabilities
Database Exposure
Admin Access
Superadmin Access

Verify:

Member cannot access Admin

Member cannot access Superadmin

Admin cannot access Superadmin

Only Superadmin can create Admins

========================================================

DATABASE DESIGN

Generate:

Users Collection

uid
email
role
societyId
status

Roles Collection

Permissions Collection

Audit Logs Collection

Societies Collection

Admins Collection

========================================================

DEBUGGING TASK

Find the exact reason why:

1. Login succeeds but user remains on homepage.
2. Student dashboard is not opening.
3. Admin panel login fails.
4. Role redirects fail.
5. User role becomes null.
6. Navigation does not happen.

Show:

* File Name
* Line Number
* Root Cause
* Impact
* Exact Fix
* Corrected Code

========================================================

OUTPUT FORMAT

SECTION 1:
Root Cause Analysis

SECTION 2:
Authentication Flow Diagram

SECTION 3:
Routing Flow Diagram

SECTION 4:
Architecture Problems

SECTION 5:
Security Problems

SECTION 6:
Database Problems

SECTION 7:
Failing Code

SECTION 8:
Corrected Code

SECTION 9:
3-Tier Architecture Design

SECTION 10:
Role Separation Design

SECTION 11:
Folder Structure

SECTION 12:
Production-Ready Firebase Rules

SECTION 13:
Production-Ready RBAC Design

SECTION 14:
Deployment Architecture

SECTION 15:
Step-by-Step Migration Plan

Act as if you are reviewing a production SaaS platform before launch and identify every architectural, security, authentication, routing, database, and role-management issue.
