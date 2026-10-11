# BCA Vault — Web Screenshot and Recording Protection

## What the website can and cannot do

BCA Vault's protected viewer uses PDF.js canvas rendering, per-student watermarking, a privacy shield on window blur/tab visibility changes, and keyboard shortcut deterrence. The viewer also suppresses context menus, copy/cut, drag-start, and text selection inside the document viewport.

These are deterrents, not a guarantee against capture.

### Important limits
- A website cannot reliably prevent operating-system screenshots or screen recordings on every browser/device.
- A person can photograph notes displayed on a laptop using a separate phone camera. A normal website cannot detect or prevent this external-camera capture.
- Browser events such as window blur or tab visibility changes are not proof that a screenshot was taken.
- Do not automatically ban a user based only on focus changes or other ambiguous browser signals.

### Recommended protections
1. Keep source PDFs in private Supabase Storage and authorize each access server-side.
2. Continue using short-lived signed URLs and student-specific watermarks.
3. Keep watermarks visible enough to identify leaked copies, while ensuring the notes remain readable.
4. Log access and suspicious patterns as signals for manual review.
5. If near-hard screenshot blocking is a business requirement, consider a native Android app using Android's secure-window capability; even this cannot stop external camera photography.

## Verification checklist
- Confirm the protected PDF viewer still loads and renders all pages.
- Verify right-click, copy/cut, drag, and text selection are suppressed inside the viewer.
- Verify search, page navigation, zoom, and normal dashboard inputs still work.
- Test focus/visibility shielding on desktop and mobile browsers.
- Run the project's typecheck and production build before merging.
