# BCA Vault — Protected PDF Viewer Architecture & Security Guide

This document specifies the architecture, security model, authorization flow, canvas rasterization, dynamic watermarking, and deployment instructions for the **Protected PDF Viewer** in BCA Vault.

---

## 1. Executive Summary & Security Philosophy

BCA Vault hosts proprietary educational notes for authenticated BCA students. Standard browser PDF rendering (e.g. `<iframe src="...pdf">` or `window.open`) exposes downloadable files, browser print dialogs, raw signed URLs, and native developer tools.

### Core Philosophy: Layered Protection & Deterrence
> **Critical Reality**: Web applications running in standard web browsers cannot guarantee mathematical prevention of hardware-level screen recording, OS-level screenshots, HDMI capture cards, or a mobile phone photographing the physical screen. 

The security architecture focuses on **defense-in-depth, content protection, and traceability deterrence**:
1. **Server-Side Authorization**: No client parameter is trusted; access rights are verified against database enrollment.
2. **Strictly Private Storage**: Files reside in private Supabase Storage buckets with public access completely disabled.
3. **Short-Lived Ephemeral Signed URLs**: URLs expire in **180 seconds (3 minutes)**, preventing URL redistribution.
4. **Canvas Rasterization via PDF.js**: PDFs are rendered directly onto HTML5 `<canvas>` elements, eliminating browser toolbars and download buttons.
5. **Dual-Layer Dynamic Watermarking**:
   - **Layer 1 (Baked-in Canvas Pixels)**: Watermark text is drawn directly into the canvas bitmap raster buffer.
   - **Layer 2 (CSS DOM Overlay)**: Floating diagonal watermark tiles across the viewport.
6. **Interaction Deterrence**: Scoped shortcut blocking (`Ctrl/Cmd + P, S, C, A, U`), context menu suppression, print stylesheet wiping, and window-blur shielding.

---

## 2. Architecture & Data Flow

```
┌─────────────────┐       1. Request Note View (note_id)       ┌───────────────────────────┐
│ Student Browser │ ─────────────────────────────────────────> │ Supabase Edge Function    │
│ (React 18 SPA)  │                                            │ (student-note-signed-url) │
└─────────────────┘                                            └───────────────────────────┘
         ▲                                                                   │
         │                                                                   │ 2. Validate Auth Token
         │                                                                   ▼
         │                                                     ┌───────────────────────────┐
         │                                                     │ PostgreSQL Database       │
         │                                                     │ - Check profiles.status   │
         │                                                     │ - Check notes.published   │
         │                                                     │ - Check access_permission │
         │                                                     │   OR student_doc_access   │
         │                                                     └───────────────────────────┘
         │                                                                   │
         │                                                                   │ 3. Generate Signed URL
         │                                                                   ▼
         │                                                     ┌───────────────────────────┐
         │                                                     │ Supabase Private Storage  │
         │                                                     │ (bca-notes / TTL = 180s)  │
         │                                                     └───────────────────────────┘
         │                                                                   │
         │ 4. Return: { signedUrl, expiresIn: 180, watermark }               │
         └───────────────────────────────────────────────────────────────────┘
         │
         │ 5. ProtectedPdfViewer (pdfjs-dist)
         │    - Fetches stream into memory buffer
         │    - Renders page to HTML5 <canvas>
         │    - Stamps dynamic watermark on canvas pixels
         ▼
┌─────────────────────────────────────────┐
│           ProtectedPdfViewer            │
│   ┌─────────────────────────────────┐   │
│   │ BCA Vault   C Notes   Page 1/24 │   │
│   ├─────────────────────────────────┤   │
│   │  [Watermark: Atharva Gogawale]  │   │
│   │           PDF CONTENT           │   │
│   │  [Watermark: UID: 0d934804...]  │   │
│   ├─────────────────────────────────┤   │
│   │ ◀  Page 1/24  ▶   − 100% +   ⛶  │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 3. Storage Configuration & Hardening

* **Bucket Name**: `bca-notes` (fallback: `Bca_notes`).
* **Public Status**: Strictly `public = false`.
* **Allowed MIME Types**: `array['application/pdf']`.
* **Access Control**:
  - Direct public HTTP requests to `/storage/v1/object/public/bca-notes/...` return `HTTP 400` ("Bucket is not public").
  - Anonymous users cannot list or download objects.
  - Document access requires a signed URL created with the service role client via server-side authorization.

---

## 4. Database Schema & Row Level Security (RLS)

### 4.1 Schema Migration (`20260903000100_protected_pdf_schema.sql`)
1. **Additive column on `public.notes`**:
   ```sql
   ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS is_protected BOOLEAN NOT NULL DEFAULT true;
   CREATE INDEX IF NOT EXISTS idx_notes_is_protected ON public.notes (is_protected);
   ```
2. **Granular student document access table**:
   ```sql
   CREATE TABLE IF NOT EXISTS public.student_document_access (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
     granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
     expires_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (user_id, note_id)
   );
   ```

### 4.2 Optimized RLS Policy
Following `supabase-postgres-best-practices`, `auth.uid()` is wrapped in `(select auth.uid())` so it executes once per statement rather than per row:

```sql
CREATE POLICY "notes_select_with_active_access"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (
    published AND (
      -- 1) Bundle Access
      EXISTS (
        SELECT 1 FROM public.access_permissions ap
        JOIN public.profiles p ON p.user_id = ap.user_id
        WHERE ap.user_id = (select auth.uid())
          AND ap.bundle_id = notes.bundle_id
          AND ap.status = 'active'
          AND p.status = 'active'
          AND (ap.expires_at IS NULL OR ap.expires_at > now())
      )
      OR
      -- 2) Direct Document Access Grant
      EXISTS (
        SELECT 1 FROM public.student_document_access sda
        JOIN public.profiles p ON p.user_id = sda.user_id
        WHERE sda.user_id = (select auth.uid())
          AND sda.note_id = notes.id
          AND p.status = 'active'
          AND (sda.expires_at IS NULL OR sda.expires_at > now())
      )
      OR
      -- 3) Active Super Admin
      (select public.is_active_admin())
    )
  );
```

---

## 5. Server-Side Authorization Flow

Endpoint: `POST /functions/v1/student-note-signed-url`
Headers:
- `apikey: <VITE_SUPABASE_PUBLISHABLE_KEY>`
- `Authorization: Bearer <STUDENT_ACCESS_TOKEN>`

### Verification Steps (Backend):
1. Validates Supabase Auth JWT token via `admin.auth.getUser(token)`.
2. Validates student account in `public.profiles` (`status === 'active'`).
3. Validates note status in `public.notes` (`published === true`).
4. Validates bundle status in `public.bundles` (`published === true`).
5. Validates active access in `public.access_permissions` OR `public.student_document_access`.
6. Generates a signed URL with **180 seconds (3 minutes)** expiration.
7. Logs `DOCUMENT_ACCESS_GRANTED` to `public.activity_logs`.
8. Returns structured JSON:
   ```json
   {
     "success": true,
     "signedUrl": "https://<project>.supabase.co/storage/v1/object/sign/bca-notes/...?token=...",
     "expiresIn": 180,
     "note": { "id": "...", "title": "...", "is_protected": true },
     "watermark": {
       "studentName": "Atharva Gogawale",
       "studentEmail": "atharva@example.com",
       "studentId": "0d934804-bd63-457c-b0fc-cf8cd2cf3ff1",
       "sessionTimestamp": "2026-09-02T17:10:00.000Z"
     }
   }
   ```

If authorization fails, returns `HTTP 403` and records `DOCUMENT_ACCESS_DENIED` in `activity_logs`.

---

## 6. Protected PDF Viewer (`ProtectedPdfViewer.tsx`)

### Canvas Rasterization
- Uses `pdfjs-dist` (version 6.x) to parse the PDF in memory.
- Pages are rendered directly onto an HTML5 `<canvas>` element using `page.render()`.
- Screen scaling is calibrated with `window.devicePixelRatio` for razor-sharp typography.
- Native browser PDF toolbars, save menus, and iframe controls are eliminated.

### Watermark Architecture
1. **Canvas Raster Burn (Layer 1)**:
   Immediately after the PDF page is rendered, a 2D canvas context stamps:
   `BCA VAULT • LICENSED STUDENT COPY • [Student Name] • [Student Email] • [Student ID] • [Date/Time]`
   repeated across a diagonal grid (`angle = -24deg`).
   Because this is written directly into the canvas bitmap buffer, DevTools CSS editing or element deletion cannot remove it.
2. **Viewport DOM Overlay (Layer 2)**:
   A semi-transparent CSS overlay sits over the viewport with `pointer-events-none select-none`.

### Deterrents & Interception
- **No UI Buttons**: Zero download, save, or print controls.
- **Context Menu**: Disabled inside the viewer via `onContextMenu={(e) => e.preventDefault()}`.
- **Text Selection**: Disabled via CSS `user-select: none`.
- **Keyboard Shortcuts**: Intercepts `Ctrl/Cmd + P` (print), `Ctrl/Cmd + S` (save), `Ctrl/Cmd + C` (copy), `Ctrl/Cmd + A` (select all), `Ctrl/Cmd + U` (view source).
- **Print Stylesheet**: `@media print { body * { display: none !important; } }` wipes the page if print is forced.
- **Window Blur Protection**: When the user alt-tabs or the document loses focus, an opaque privacy shield blurs and covers the document.

---

## 7. Native Android Application Guidance (`FLAG_SECURE`)

If BCA Vault is wrapped or ported into a native Android app (e.g. Capacitor, WebView, or Android Kotlin):

### Native Android Implementation
To prevent OS-level screenshots, screen recording, and system recent-apps previews:

```kotlin
// In MainActivity.kt / ProtectedActivity.kt
import android.os.Bundle
import android.view.WindowManager
import androidx.appcompat.app.AppCompatActivity

class ProtectedViewerActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Set FLAG_SECURE before setContentView
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE
        )
        setContentView(R.layout.activity_protected_viewer)
    }
}
```

### Capacitor / Cordova Plugin
If using Capacitor:
```bash
npm install @capacitor-community/privacy-screen
npx cap sync
```
In `capacitor.config.json`:
```json
{
  "plugins": {
    "PrivacyScreen": {
      "enable": true
    }
  }
}
```

---

## 8. Threat Model: Boundaries & Honesty

| Capability | Security Status | Mechanism |
| :--- | :--- | :--- |
| **Direct URL Downloading** | **PROTECTED** | Bucket is private; signed URLs expire in 180s; permanent URLs never exposed. |
| **Unauthorized Access** | **PROTECTED** | Server-side JWT session + active profile + bundle/document enrollment check. |
| **Browser PDF Plugin Toolbar** | **PROTECTED** | Canvas-based rendering (`pdfjs-dist`); no `<embed>` or `<iframe src="...pdf">`. |
| **Right-Click Save As** | **DETERRED** | Canvas context menu disabled; DOM contains canvas, not raw PDF. |
| **Keyboard Print / Save / Copy** | **DETERRED** | Intercepts `Ctrl/Cmd + P, S, C, A, U`; print stylesheet wipes page. |
| **Background Window Recording** | **DETERRED** | Window blur / tab visibility detection shields content on focus loss. |
| **Tampering with Watermark** | **DETERRED** | Watermark is burned into canvas pixel bitmap + dual DOM overlay. |
| **OS-Level Screenshot (Web)** | **IMPOSSIBLE ON WEB** | Browsers have no API to block OS screenshot tools (`Win+Shift+S`, Snipping Tool). |
| **Hardware Capture / External Camera** | **IMPOSSIBLE ON WEB** | External cameras or HDMI splitters bypass software controls; mitigated by dynamic user watermark identifying source. |

---

## 9. Deployment & Verification Steps

### 1. Database Migration
Apply migration `supabase/migrations/20260903000100_protected_pdf_schema.sql` via Supabase Dashboard or CLI:
```bash
npx supabase db push
```

### 2. Edge Function Deployment
Deploy `student-note-signed-url`:
```bash
npx supabase functions deploy student-note-signed-url
```

### 3. Frontend Build & Deploy
Verify typecheck and build:
```bash
npm run typecheck
npm run build
```
Deploy to Vercel (rewrites and security headers in `vercel.json` are automatically applied).

### 4. Run Automated Security Test Suite
```bash
npx tsx scripts/test_protected_pdf_flow.ts
```
Expected output:
```text
TEST SUMMARY: 10/10 TESTS PASSED
SECURITY STATUS: ALL CRITICAL CONTROLS VERIFIED SUCCESSFULLY.
```
