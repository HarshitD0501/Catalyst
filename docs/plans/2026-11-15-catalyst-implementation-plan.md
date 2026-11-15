# Catalyst: Intelligent Elderly Care & Family Coordination Platform

Status: Active engineering roadmap and implementation plan.
Target final deployment: 15:30 Asia/Kolkata.

## Product Vision & Problem Scope

Catalyst addresses the multi-faceted challenges of geriatric and chronic healthcare: medication non-adherence, caregiver coordination friction, and cognitive load on elderly patients.

The platform provides shared patient profiles, secure passcode-based access for family members and caregivers, comprehensive medication schedule management, real-time dose adherence tracking, clinical appointment scheduling, and proactive multi-channel reminders (mandatory transactional email alerts backed by durable retry outbox, supplemented by voice and messaging channels). Evaluation focus: code quality, zero-trust security, operational efficiency, automated test coverage, WCAG 2.2 accessibility, and Google services integration (Gemini VLM & Live Audio).

## Current source findings

| Area | Evidence | Plan implication |
|---|---|---|
| Existing UI | frontend/app/app/page.js renders Dashboard/Caregiver from verified auth state | Preserve layout, components, styling, and role routing |
| OCR review | main.py _persist_meds uses pending_review until report confirmation; list_medicines filters confirmed reports | Preserve and regression-test; old audit's blanket broken-gate claim is stale |
| Caregiver scope | auth.py resolve_actor checks CaregiverLink and X-Patient-Id | Reuse relationship checks, add explicit action permissions and revocation |
| Caregiver onboarding | caregiver.py exposes family listing and contact update; no invitation/passcode routes found | Add patient-owned invitation lifecycle |
| Link model | CaregiverLink has pair uniqueness and consent timestamp, no permission or revocation fields | Extend through migration, not startup schema patching |
| Appointments | main.py has list/create/reschedule/cancel APIs; scheduler.py has claims and leases | Reuse; verify report ownership on creation and extend email delivery |
| Scheduler exposure | POST /api/appointments/tick accepts current_patient but calls tick_reminder_tasks without patient scope | Restrict global processing to worker/service identity; test ordinary-user rejection |
| Sessions | frontend/lib/api.js stores bearer tokens in localStorage; backend signs expiring HMAC tokens | Address session theft/revocation and malformed-token behavior without cosmetic JWT replacement |
| Voice proxy | next.config.mjs broadly rewrites /agent/* to an agent service | Audit exposed routes; remove unauthenticated token/demo paths from deployed routing |
| Email | No email sender/passcode/invitation implementation found in backend/app search | Build channel adapter and recipient verification |
| CI | .github/workflows/ci.yml runs isolated backend tests and frontend build | Extend existing CI with frontend tests and critical new integration tests |
| Efficiency | caregiver list performs repeated queries per linked patient; overview dates use server-local date and report follow-ups | Batch aggregates; use patient timezone and canonical Appointment records |

Source review only: no current test suite, live provider, dependency audit, or deployed behavior has been verified during planning.

## Architecture and scope

Retain Next.js + FastAPI + SQLAlchemy/Alembic. Use persistent PostgreSQL for deployment, preserving the existing prescription checkpoint integration. Keep authenticated API traffic through the same-origin Next proxy. Run the voice worker separately from frontend request handlers. Run email processing using a durable outbox and a continuously running worker or authenticated scheduled invocation.

Do not rewrite the frontend, change database paradigms, convert the entire codebase to TypeScript, or split into new microservices today. Add focused services/modules for invitations, permissions, and email instead of extending main.py indefinitely. Reuse existing client contracts; do not add a third independent API client.

Existing features stay in the project. Broken or unconfigured integrations must expose a truthful unavailable state. Retaining code does not establish live service availability. Browser voice is a deliverable; outbound telephone calls are an additional integration requiring separate SIP/provider verification.

## Phase 1: import and establish the deployment path (target 11:00)

1. Inventory tracked source and assets; copy frontend/backend/agent and relevant configuration/tests in dependency-complete batches. Preserve third-party attribution. Never copy .env, databases, real patient data, .git, node_modules, virtual environments, or build output.
2. Record source revision and imported modules. Create safe .env.example files with placeholders and explicit production-disabled demo modes.
3. Install from manifests/lockfile; run existing backend tests, frontend tests, and build. Triage failures by security and challenge impact.
4. Confirm hosting, PostgreSQL, email sender, Gemini, and LiveKit access immediately. Establish the first HTTPS deployment early, then iterate; do not wait until the final hour to discover infrastructure blockers.
5. Verify fresh database migrations and server startup with production settings. Select an available Gemini model through a real small test; do not assume the old example model is still available.

Acceptance: clean install/build or an explicit failure list; deployed health response; persistent database; no secrets in tracked source. This is the first checkpoint commit.

## Phase 2: patient-controlled care circle and security (target 12:15)

Implement a signed-in patient creating an invitation for a specific caregiver email, relation, and permission level. The caregiver signs in and redeems a short-lived, single-use passcode bound to that invitation and recipient. Interpret passcode access as secure profile sharing; do not use one permanent shared PIN for everyone. If organizers explicitly require passcode-only login, confirm that requirement and use verified email OTP sessions separately.

Suggested defaults: cryptographically generated 8-digit code, 10-minute expiry, five failed attempts per invitation, account/IP rate limits, keyed digest at rest, no code logging, atomic consume to prevent concurrent redemption, reissue invalidates the old code. Recipient identity must be verified before access becomes active. Invitation IDs must be unguessable. Reuse existing links only after validating their consent origin.

Permissions:

| Action | Patient owner | Care manager | Viewer |
|---|---|---|---|
| Read shared profile/history/schedule | Yes | Yes | Yes |
| Edit medication schedule / appointments | Yes | Explicit grant | No |
| Record dose with actor attribution | Yes | Explicit grant | No |
| Invite/revoke members/change permissions | Yes | No | No |
| Change login identity/security settings | Yes | No | No |

Add link status/revoked_at and permissions, invitation state, and audit events. Resolve actor AND target patient for every action; do not lose actor identity by returning only the target. Explicitly select a patient for caregiver writes. Revalidate permissions on every voice tool call as well as HTTP requests. Revoke access on subsequent requests and clear patient-scoped UI caches immediately.

For browser sessions, move bearer material behind Secure/HttpOnly/SameSite cookies using the existing same-origin proxy, with server-side revocation or session version checks. Add origin/CSRF validation for cookie-authenticated writes; test all proxy clients and voice token creation. Keep backend service credentials distinct from user sessions. Reject malformed/expired tokens with 401, fail closed on missing production secrets, use exact CORS origins, and rate-limit auth/OTP/upload/voice-token operations. Restrict global scheduler endpoints to service identity. No authentication bypasses for judges.

Acceptance: owner creates invite; intended caregiver redeems once; wrong recipient, wrong/expired code, revoked link, read-only write, and unrelated patient ID are denied. No secrets or patient data in errors/logs. Two-browser demonstration passes.

## Phase 3: shared care workflow and mandatory email (target 13:30)

1. Extend existing patient and caregiver screens with Care Circle, Today, and Appointments using the current visual system. Make selected patient unambiguous.
2. Provide manual medicine/schedule add-edit-stop alongside OCR. Preserve draft review and explicit confirmation. Changing a schedule invalidates future stale dose tasks without rewriting historical adherence.
3. Use stable scheduled-dose identity, timezone-aware timestamps, idempotent updates, and optimistic concurrency where caregivers may edit simultaneously. Record who reported a dose. An elapsed unconfirmed dose means 'not confirmed', not proof of nonadherence; allow explicit missed/skipped states and correction history.
4. Connect existing appointment APIs; make caregiver cards use Appointment records. Verify every supplied report/medicine ID belongs to the selected patient.
5. Extend durable tasks with email channel, event kind, recipient, status, next attempt, attempts, provider ID, deduplication key, and error category. Preserve existing task/version cancellation logic.
6. Schedule upcoming-dose, overdue/unconfirmed-dose, and appointment emails to verified recipients selected by the patient. Suppress obsolete tasks after dose confirmation, medication changes, appointment cancellation, or access revocation. Recheck recipient authorization at send time.
7. Apply bounded retries, leases, and provider idempotency where available. Do not promise exactly-once delivery: acknowledge the send-success/database-failure ambiguity and reconcile provider IDs where supported. Distinguish provider acceptance from confirmed delivery.
8. Use minimal-content email with an authenticated deep link. Never mark a dose taken using an email GET link; require a signed-in explicit action. Mock only transport in automated tests, not delivery success in the UI.

Acceptance: patient action is visible to caregiver after refresh/poll; three email categories work against an authorized test inbox; reschedule/cancel/revocation prevents stale sends. Worker restart and duplicate processing tests pass. Email setup is a mandatory dependency, not an optional enhancement.

## Phase 4: retain OCR, maps, history, and voice (target 14:15)

- OCR: retain scan/review UI, use Gemini where configured, validate structured output and image size/type/decode limits; uncertain fields require human correction. Treat document text as untrusted data. No invented prescription on provider failure. Migrate the legacy backend Google SDK using its official migration guide if required for the live integration; test in isolation.
- History: preserve screens and patient scoping; use backend records as authority, patient-specific cache keys, logout/revocation cleanup, and bounded pagination. Do not retain sensitive histories in a public service-worker cache.
- Maps: keep current UI/provider, validate actual response and attribution, provide a list/manual-location fallback. Do not claim verified opening hours, stock, or routes without data. Maps migration to Google is unnecessary solely for scoring.
- Voice: retain frontend LiveVoiceAgent and agent worker, authenticated short-lived room-scoped tokens, server-selected patient scope, and a distinct actor/session binding. Verify microphone permission, connection, audible response, interruption, and one authorized read tool. Caregiver voice must not bypass permissions; mutations require explicit confirmation and backend checks. Revocation invalidates further tool access. Do not expose a standalone development /token endpoint through the production proxy.
- Reuse existing Google sign-in if configured. Test OAuth origins against the final domain. A working Gemini integration is meaningful Google service usage; extra infrastructure is optional, not a reason to delay core delivery.

Acceptance: deployed OCR draft/review/history loop, functioning map or truthful provider-failure state, and one live browser voice session. Each service has a visible failure path. Record unmet integration gates instead of claiming completion.

## Phase 5: polish, verification, and submission (14:15–15:30)

| Scoring category | Evidence to produce |
|---|---|
| Code quality | Focused service modules, validated schemas, consistent errors, reproducible install/build, preserved license notices |
| Security | Permission matrix tests; IDOR, OTP replay/expiry, CSRF/session, upload, scheduler, and voice-scope checks |
| Efficiency | Batched caregiver queries, DB indexes, bounded history, cached public map results, lazy map/audio imports; report measured timings |
| Testing | Existing suites plus new integration tests; two-account browser journey; clean PostgreSQL migration; provider failure paths |
| Accessibility | Keyboard/focus/dialog checks, labels and live status, 200% zoom, contrast, mobile reflow, large primary controls, reduced motion; text alternative to voice |
| Problem alignment | Working demonstration for every mandatory image requirement, especially care sharing and all email categories |
| Google services | Document real Gemini/Google identity request path and successful live test, without exposing keys |

Required live smoke: sign up/login; invite/accept; read-only denial; OCR review or manual medicine; mark dose; caregiver refresh; appointment/reschedule; email; history; map; browser voice; revoke; confirm denied access. Backend outage must not return fake successful actions. Check HTTPS, production secrets, exact origins, restart persistence, server logs, and worker health.

Run dependency/secret scans and investigate reachable high/critical findings; do not blindly force-upgrade packages. Extend CI to run frontend tests as well as build. Fix critical-path failures before visual extras. No all-feature refactor or technology migration for its own sake.

At 15:30 freeze noncritical changes. Keep the final hour for deployment repairs, rollback, and submission. Because final phase submission counts, verify the last deployed commit and URL in an incognito browser. Supply the deployed URL, commit SHA, setup guide, requirements checklist, test results, known limitations, reuse attribution if required, and a short demo recording.

## Deployment decisions and outstanding input

Choose the hosting account already available. Need frontend hosting, persistent backend/database, email provider with usable verified sender, Gemini, and a voice-worker host/LiveKit project. Credentials belong in provider secret settings, not chat or git. Do not assume account access, billing approval, domain verification, or quotas.

If using Cloud Run, do not depend on an in-process timer running while the service has no requests. Use authenticated Cloud Scheduler invocation or a separately configured worker. Global scheduler auth must validate the service identity; ordinary app auth is insufficient. LiveKit Cloud supports agent deployment, or retain a separately hosted long-running worker. Do not deploy the Python voice worker as a frontend serverless function.

If credentials block a retained feature, keep its code and report the integration as unavailable while resolving the dependency. This is an incomplete feature, not permission to fabricate it. Do not silently remove the user's requested voice/OCR/maps scope. Mandatory care coordination, security, email, and a deployed link take precedence over optional pricing/telephony enhancements.

## Official references consulted

- Authorization checks, least privilege, and deny-by-default: https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- Expiring single-use codes and brute-force protections (adapted from recovery-code guidance to invitations): https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html
- Google SDK migration: https://ai.google.dev/gemini-api/docs/migrate
- Scheduled authenticated Cloud Run invocation: https://cloud.google.com/run/docs/triggering/using-scheduler
- Voice agent deployment: https://docs.livekit.io/deploy/agents/
- Accessibility checks: https://www.w3.org/WAI/WCAG22/quickref/

These references support implementation choices, not a claim of compliance, bug freedom, clinical validation, or organizer approval.
