# Secure Quiz architecture and staged implementation

Audit: React/Vite/Tailwind with Supabase Auth and separate student/admin clients. Active superadmins are authorized through admin_profiles and is_active_admin(). Existing profiles, activity_logs, coupon_campaigns, coupon_redemptions and payment_submissions will be reused. Historical Firebase documentation is stale relative to executable code. There is no existing quiz engine or persistent endpoint limiter.

Stages: (1) audit and contract; (2) transactional database engine and security tests; (3) student and existing admin UI; (4) account-bound checkout integration; (5) build, security, regression verification and deployment documentation.

Use one authenticated quiz_api(action,payload) RPC, with private security-definer helpers, explicit ownership checks, empty search paths and no direct table grants. Store competition, question bank, attempts, frozen assigned questions/answers, event timeline and reviewed winners. Reuse activity_logs for admin audits and coupon_redemptions for approved account rewards. Rate counters are private. Do not duplicate result/answer tables when attempt/assignment rows hold those records.

Timers: database timestamps and row locks decide acceptance. Answering advances immediately; timeouts advance from the prior deadline. A disconnected browser cannot extend the maximum active duration. The browser uses a monotonic countdown and refetches authoritative state. Fairness uses configured subject/difficulty/marks slots, least-used random selection, immutable snapshots and randomized options. Correct answers and scores are withheld until official publication.

Admin approval is separate from publication; at most three approved accounts receive the existing 299 offer. Regular 349 pricing and referrals remain. Unique payment redemption plus database eligibility checks prevent double use. Browser events are untrusted review signals, never automatic proof of cheating. Bounded polling avoids broad realtime row exposure.

Baseline has committed conflict markers in several Edge Functions and malformed Hero JSX. Repair only the blockers needed for verification, recording them separately. No production deployment or production data mutation is part of local testing. New competition is seeded DRAFT and must be reviewed and scheduled explicitly.
