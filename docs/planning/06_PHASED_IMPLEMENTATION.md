# 06. Detailed Phase-Wise Implementation Roadmap

**Execution Protocol:** Strict Phase-Gated Progression (Implement one phase -> verify tests -> request approval -> proceed)  
**Total Phases:** 5 Phases  
**Final Submission Deadline:** 15:30 Asia/Kolkata  
**Status:** Authorized Execution Roadmap  

---

## Phase 1: Environment Baseline, Test Runner Hardening & Database Migration Readiness

### 1. Objective & Problem-Statement Justification
Establish a reproducible, clean development baseline. Resolve Windows asyncio test crashes, verify PostgreSQL compatibility, and ensure the automated test suite runs 100% green before introducing application changes. Without a working test runner, code quality cannot be validated.

### 2. Current Verified Implementation
- Initial codebase scaffold present.
- Frontend tests (`test-history-basket.mjs`, `test-resource-cache.mjs`) pass 100%.
- Backend tests fail with Windows `ProactorEventLoop` socket cleanup `AttributeError: '_ssock'` during `TestClient` teardown.
- `Catalyst/frontend/node_modules` is missing; `test-dependencies.mjs` fails looking for Next.js.

### 3. Required Changes
- Add `conftest.py` in `backend/tests/` to configure `asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())` on Windows.
- Update `run_isolated_tests.py` to handle clean environment variable passing and report timing metrics.
- Generate an initial Alembic migration baseline covering all existing models.
- Run `npm install` in `frontend/` to establish pinned dependencies.

### 4. Exact Files to Create or Modify
- **Create:** `backend/tests/conftest.py`
- **Modify:** `backend/run_isolated_tests.py`
- **Modify:** `backend/alembic.ini`
- **Modify:** `frontend/package.json`

### 5. Files Proposed for Deprecation or Removal
- None. (Preserve all existing assets).

### 6. Database Migration Strategy
- Run `alembic revision --autogenerate -m "baseline_schema"` to verify schema parity against both SQLite and PostgreSQL.

### 7. Security Implications
- Safe local testing environment; ensure zero secrets committed to `.env.example`.

### 8. Step-by-Step Implementation Instructions
1. Create `backend/tests/conftest.py` with Windows asyncio event loop policy fixture.
2. In `backend/run_isolated_tests.py`, set `PYTHONUTF8=1` in subprocess environment to prevent UnicodeEncodeError on Windows terminals.
3. Run `backend/run_isolated_tests.py` and verify all baseline test suites pass without socket errors.
4. Execute `npm --prefix frontend install` and run `node frontend/scripts/test-dependencies.mjs`.

### 9. Acceptance Criteria & Definition of Done
- `backend/run_isolated_tests.py` exits with code 0.
- All frontend test scripts exit with code 0.
- Baseline git commit tagged `phase-1-baseline`.

---

## Phase 2: Care Circle, Passcode Invitation Engine & Zero-Trust RBAC

### 1. Objective & Problem-Statement Justification
Implement core requirements REQ-02 and REQ-03: Patient-controlled care circle onboarding through single-use 8-digit passcodes, role-based permissions (Care Manager vs Family Viewer), and immediate revocation. Eliminate BOLA/IDOR vulnerabilities across patient endpoints.

### 2. Current Verified Implementation
- Basic `CaregiverLink` model exists in `backend/app/main.py`.
- No invitation model, passcode generator, or redemption endpoint.
- Endpoints accept untrusted `X-Patient-Id` headers.

### 3. Required Changes
- Create `Invitation` SQLAlchemy model with fields: `id`, `patient_id`, `recipient_email`, `relationship`, `role`, `permissions`, `passcode_hash`, `passcode_salt`, `expires_at`, `attempt_count`, `max_attempts`, `status`, `created_at`, `redeemed_at`.
- Extend `CaregiverLink` with: `role`, `permissions` (JSON), `status` (`ACTIVE`, `REVOKED`), `revoked_at`.
- Build cryptographic passcode generator (8 digits CSPRNG, HMAC-SHA256 hash).
- Implement REST API endpoints:
  - `POST /api/care-circle/invitations` (Patient only)
  - `POST /api/care-circle/redeem` (Authenticated caregiver)
  - `GET /api/care-circle/members` (Care circle roster)
  - `POST /api/care-circle/members/{id}/revoke` (Patient only)
- Create unified `resolve_actor_context` FastAPI dependency enforcing least-privilege RBAC.
- Add Care Circle modal UI in `frontend/components/Dashboard.js`.

### 4. Exact Files to Create or Modify
- **Create:** `backend/app/care_circle.py`
- **Modify:** `backend/app/main.py`
- **Modify:** `backend/app/models.py` (or model definitions in `main.py`)
- **Modify:** `frontend/components/Dashboard.js`
- **Modify:** `frontend/components/Caregiver.js`
- **Create:** `backend/tests/test_care_circle.py`

### 5. Acceptance Criteria & Definition of Done
- Patient creates invite; recipient receives 8-digit code.
- Caregiver redeems code; status transitions to `REDEEMED`, `CaregiverLink` created.
- Replaying redeemed or expired code returns HTTP 400.
- 5 wrong attempts lock the invitation (HTTP 401 -> 400).
- Caregiver with `VIEWER` role is rejected (HTTP 403) when attempting write operations.
- Patient revoking access immediately blocks subsequent caregiver requests with HTTP 403.
- All new tests in `test_care_circle.py` pass.

---

## Phase 3: Medication Schedule CRUD, Dose Adherence Tracking & Durable Email Reminders

### 1. Objective & Problem-Statement Justification
Implement core requirements REQ-04, REQ-05, REQ-06, and REQ-08: Complete manual medication management (add, edit, discontinue), dose adherence check-in with actor attribution, and transactional email alerts (upcoming doses, missed doses, appointments) using an atomic outbox.

### 2. Current Verified Implementation
- Medications coupled to prescription OCR review.
- `DoseLog` lacks actor attribution (`logged_by_user_id`).
- Outbox processor only supports WhatsApp and Phone calls; email transport absent.

### 3. Required Changes
- Implement standalone Medication CRUD endpoints:
  - `GET /api/medications`
  - `POST /api/medications`
  - `PUT /api/medications/{id}`
  - `DELETE /api/medications/{id}` (Discontinue, sets `is_active=False`)
- Extend `DoseLog` with `logged_by_user_id`, `actor_role`, and client timestamp.
- Implement `backend/app/email_sender.py` supporting standard SMTP and Resend API.
- Extend `backend/app/scheduler.py` to process `channel == "EMAIL"` tasks with retry backoff and idempotency keys.
- Create responsive HTML email templates for:
  1. Upcoming dose reminder (15 min prior).
  2. Missed dose alert (30 min overdue) sent to patient and designated caregiver.
  3. Appointment reminder (24h / 2h prior).
- Update frontend `Dashboard.js` with manual "Add Medicine" modal and clear dose check-in states.

### 4. Exact Files to Create or Modify
- **Create:** `backend/app/email_sender.py`
- **Modify:** `backend/app/main.py`
- **Modify:** `backend/app/scheduler.py`
- **Modify:** `backend/app/config.py`
- **Modify:** `frontend/components/Dashboard.js`
- **Create:** `backend/tests/test_email_reminders.py`

### 5. Acceptance Criteria & Definition of Done
- Manual medicine creation generates scheduled dose slots in `dose_logs`.
- Marking a dose taken records `logged_by_user_id` and recalculates adherence score.
- Due reminder task dispatched via email with valid provider message ID.
- Worker retry backoff successfully reschedules temporary failures without dropping tasks.
- All tests in `test_email_reminders.py` pass.

---

## Phase 4: Google Services Integration & Voice/Maps Hardening

### 1. Objective & Problem-Statement Justification
Satisfy the Google Services evaluation category (REQ-10) with production-grade integrations: Google Gemini 2.0 / 1.5 Pro VLM for multimodal prescription OCR and Google OAuth sign-in. Harden the LiveKit voice agent and OpenStreetMap facilities locator with graceful fallbacks.

### 2. Current Verified Implementation
- Prescription preprocessor uses legacy Google SDK syntax.
- Voice agent has LiveKit room plumbing but needs actor permission validation on tool calls.
- Leaflet map shows fixture coordinates; lacks live graceful failure feedback.

### 3. Required Changes
- Refactor `backend/app/preprocessor.py` to use `google-genai` SDK (`gemini-2.0-flash` or `gemini-1.5-pro`).
- Add structured Pydantic response schema (`ExtractedPrescription`) enforcing strict typing on drug names, dosage, and frequency.
- Validate incoming Google OAuth ID tokens against Google public keys using `google-auth`.
- Update `agent/voice.py` tools (`get_my_medications`, `mark_dose_taken`) to validate `resolve_actor_context` before mutating data.
- Add truthful fallback UI to `frontend/components/FacilityMap.js` when GPS or Overpass API fails.

### 4. Exact Files to Create or Modify
- **Modify:** `backend/app/preprocessor.py`
- **Modify:** `backend/app/main.py`
- **Modify:** `agent/voice.py`
- **Modify:** `agent/prompt.py`
- **Create:** `backend/tests/test_google_services.py`

### 5. Acceptance Criteria & Definition of Done
- Prescription image parsed by Gemini returns structured JSON matching `ExtractedPrescription`.
- Prompt injection attempts within prescription images are rejected.
- Voice agent tool calls enforce caller permissions.
- Google OAuth token verification passes.

---

## Phase 5: Elderly-First Accessibility (WCAG 2.2 AA), Performance & Final Submission Verification

### 1. Objective & Problem-Statement Justification
Achieve maximum score on Accessibility, Efficiency, and Code Quality. Deliver an elderly-friendly interface (large touch targets, high contrast, audio playback, Hindi/English bilingual support) and execute end-to-end verification across the entire platform before the 15:30 deadline.

### 2. Current Verified Implementation
- Responsive Tailwind UI with standard button sizes.
- Missing ARIA live regions and keyboard focus rings.
- Backend queries lack indexes on high-frequency foreign keys (`patient_id`, `scheduled_time`).

### 3. Required Changes
- Frontend Accessibility Hardening:
  - Add "Senior Mode" toggle with min 48x48px touch targets and 7:1 color contrast.
  - Implement Web Speech API audio dose reader button (speaks dose schedule in Hindi or English).
  - Add ARIA live regions (`aria-live="polite"`) for real-time dose confirmation announcements.
- Database Performance Optimization:
  - Add composite index on `(patient_id, scheduled_time)` in `dose_logs`.
  - Add index on `(status, scheduled_for_utc)` in `reminder_tasks`.
- CI/CD & Final Verification:
  - Update `.github/workflows/ci.yml` to run backend isolated tests and frontend build.
  - Execute full end-to-end smoke test script simulating a complete patient-caregiver journey.

### 4. Exact Files to Create or Modify
- **Modify:** `frontend/components/Dashboard.js`
- **Modify:** `frontend/components/ui.js`
- **Modify:** `frontend/contexts/LanguageContext.js`
- **Modify:** `backend/app/main.py` (DB indexes)
- **Modify:** `.github/workflows/ci.yml`
- **Create:** `docs/planning/evidence/final_submission_report.md`

### 5. Acceptance Criteria & Definition of Done
- Automated accessibility score >= 95 on Lighthouse / axe-core.
- All database queries for today's doses execute in < 20ms.
- 100% green tests across backend, frontend, and integration suites.
- Complete 2-browser incognito live demonstration verified.
- Deployment package prepared for submission.
