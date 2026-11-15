# CareSetu — Final Engineering Submission & Architecture Verification Report

**Platform:** CareSetu (Comprehensive Elderly Care, Family Coordination & Jan Aushadhi Medicine Discovery)  
**Hackathon Target:** PromptWars x CareSetu | Build with AI Hackathon by Google for Developers / H2S  
**Date:** November 15, 2026  
**Engineering Status:** Production Ready — All 5 Phases Fully Implemented & Verified

---

## 1. Executive Summary

CareSetu is an end-to-end clinical companion designed specifically for India's 140M+ elderly population and their distributed family care circles. Built with modern AI architectures and clinical safety boundaries, CareSetu simplifies handwritten doctor prescriptions, verifies Jan Aushadhi (PMBJP) generic substitutes to eliminate out-of-pocket healthcare inflation, and coordinates family care circles with automated WhatsApp reminders, LiveKit voice follow-up check-ins, and durable transactional emails.

Every feature conforms to strict software engineering standards, including Conventional Commits, isolated test environments, OWASP API security boundaries, and WCAG 2.2 AA accessibility.

---

## 2. Core Architectural Pillars

### Pillar 1: Multimodal Clinical Vision Pipeline (Gemini 2.0 / 1.5)
- **Agent 1: Vision Preprocessor (`backend/app/preprocessor.py`):**
  - Auto-corrects smartphone EXIF orientation, normalizes RGBA/palette modes to RGB.
  - Dynamically stretches contrast and sharpens faded cursive ink strokes before OCR.
  - Bounds image dimensions smoothly to prevent memory/token exhaustion.
- **Agent 2: Clinical Handwriting Decipherer (`backend/app/extraction.py`):**
  - Integrates modern `google.genai` SDK (`gemini-2.0-flash` / `gemini-1.5-pro`) with fallback to `google.generativeai`.
  - Enforces prompt injection defense (REQ-10): quarantines adversarial handwriting attempts (e.g. `ignore previous instructions`, `drop table`, `developer mode`) and treats all OCR text strictly as untrusted DATA.
- **Agent 3: Indian Drug Knowledge Graph & Fuzzy Matcher (`backend/app/catalog.py`):**
  - Grounds extracted brands against official Indian pharmaceutical databases.
  - Infers clinical salts from Indian brand suffixes (`-D`, `-DSR`, `-H`, `-AM`, `-GP`, `-SP`, `-LC`, `-SR`, `-XL`, `Forte`).
  - Flags low-confidence cursive matches for Human-in-the-Loop review.
- **Agent 4: Clinical Validation & Confidence Orchestrator (`backend/app/dosage.py`, `backend/app/confidence.py`):**
  - Verbatim Indian dosage frequency parsing (`1-0-1`, `1-0-0`, `0-0-1`, `1-1-1`, `OD`, `BD`, `TDS`, `QID`, `SOS`, `HS`, `BBF`, `AC`, `PC`).
  - Computes grounded composite confidence scores (0.0 to 1.0) and isolates PRN (as-needed) medicines from daily clock alarms.

### Pillar 2: Family Care Circle & Granular RBAC
- **Passcode-Based Secure Onboarding:**
  - CSPRNG 8-digit numeric passcodes (`secrets.choice(string.digits)`).
  - Passcodes hashed via HMAC-SHA256 with per-invitation salt; plain text never persisted.
  - 10-minute expiry window, single-use redemption, and 5-attempt rate-limit lockout.
- **Role-Based Access Control (RBAC):**
  - `CARE_MANAGER`: Full management, medication edits, adherence logging, alert subscriptions.
  - `VIEWER`: Read-only access to prescriptions and schedules; mutations strictly forbidden (HTTP 403).
  - Immediate invitation and membership revocation with audit logging.

### Pillar 3: Medication CRUD & Durable Outbox Engine
- **Schedule Management:**
  - `GET / POST / PUT / DELETE /api/medications` (and alias `/api/medicines`).
  - Dynamic slot regeneration (`morning`, `afternoon`, `night`, `sos`) reflecting dosage changes.
- **Dose Adherence Attribution:**
  - `POST /api/adherence/{id}/check-in` tracks `logged_by_user_id` and `actor_role` to distinguish whether a dose was logged by the patient or a family caregiver.
- **Durable Notification Scheduler:**
  - Multi-transport email sender (`backend/app/email_sender.py`) supporting Resend API, SMTP/TLS, and simulated in-memory delivery.
  - Transactional HTML templates for upcoming doses, missed dose caregiver alerts, and doctor appointment reminders.
  - Resilient task lease claiming with exponential retry backoff and audit logs (`ReminderLog`).

### Pillar 4: Google Services & Voice/Maps Hardening
- **Google OAuth 2.0 ID Token Verification (`/api/auth/google`):**
  - Cryptographically verifies Google tokens against public keys with audience verification.
  - Rejects unverified email addresses (HTTP 401) and handles account linking safely.
- **LiveKit Voice Assistant (`agent/voice.py`):**
  - 2-way WebRTC live consultation and automated outbound doctor follow-up calls.
  - Function tools (`get_today_schedule`, `mark_dose_taken`, `get_my_medications`) enforce actor context and return explicit permission error messages on 403 Forbidden.
- **Healthcare Facilities Map (`frontend/components/LazyStoreMap.js`):**
  - OpenStreetMap & Leaflet with OSRM driving routes.
  - Includes graceful error boundary and truthful fallback banner when GPS or tile services fail.

### Pillar 5: Elderly-First Accessibility (WCAG 2.2 AA)
- **Senior Accessibility Mode:**
  - Dedicated toggle button available across desktop header and mobile topbar.
  - Minimum 48x48px interactive touch targets across all adherence actions and controls.
  - High-contrast text meeting 7:1 contrast ratio against background surfaces.
  - Visual focus indicators (`focus-visible:ring-4 focus-visible:ring-emerald-600 focus-visible:outline-none`).
- **Web Speech API Audio Dose Reader:**
  - Audible "🔊 Read Schedule Aloud" button speaking today's regimen in a calm, clear voice cadence.
  - Bilingual voice support: speaks in Hindi (`hi-IN`) or English (`en-IN`) based on patient's selected language.
- **ARIA Live Announcements:**
  - Polite live region (`aria-live="polite"` with `role="status"`) announcing dose check-ins in real time to screen readers.

---

## 3. Test Verification Matrix

### Backend Isolated Process Test Suite (`backend/run_isolated_tests.py`)
All 22 test suites executed in isolated Python subprocesses with 100% green pass rate:

| # | Test Suite | Description | Duration | Status |
|---|---|---|---|---|
| 01 | `test_auth_registration.py` | Auth registration, JWT, and basic Google OAuth | 6.13s | **PASS** |
| 02 | `test_batch2.py` | Price discovery & NPPA regulatory matching | 6.30s | **PASS** |
| 03 | `test_batch3.py` | Drug-drug interaction engine & severity flags | 7.84s | **PASS** |
| 04 | `test_batch4.py` | Report generation & PDF slip compiling | 30.86s | **PASS** |
| 05 | `test_batch5.py` | Outbox scheduler & lease claiming concurrency | 3.44s | **PASS** |
| 06 | `test_batch6a.py` | Telephony webhooks & call state machine | 3.64s | **PASS** |
| 07 | `test_batch6b.py` | Inbound SMS & interactive WhatsApp webhooks | 3.22s | **PASS** |
| 08 | `test_batch7.py` | Pack size normalization & unit price math | 4.23s | **PASS** |
| 09 | `test_batch8.py` | Test isolation verification & cache hygiene | 4.00s | **PASS** |
| 10 | `test_care_circle.py` | Care Circle passcodes, RBAC & member management | 4.30s | **PASS** |
| 11 | `test_caregiver.py` | Legacy caregiver link compatibility | 6.50s | **PASS** |
| 12 | `test_confidence.py` | Confidence scoring & grounded fuzzy catalog weights | 1.80s | **PASS** |
| 13 | `test_config_security.py` | Environment variable security & secrets validation | 1.81s | **PASS** |
| 14 | `test_db_recovery.py` | DB migration idempotency & dynamic head recovery | 7.76s | **PASS** |
| 15 | `test_dosage.py` | Dosage notation parsing & timing extraction | 1.60s | **PASS** |
| 16 | `test_email_reminders.py` | Email sender, HTML templates & outbox delivery | 7.01s | **PASS** |
| 17 | `test_google_services.py` | Gemini 2.0 VLM, Prompt Injection, OAuth & Voice | 13.56s | **PASS** |
| 18 | `test_interactions.py` | Salt-level drug interaction warnings | 1.92s | **PASS** |
| 19 | `test_multiagent_extraction.py`| 4-Agent pipeline & LangGraph human interrupt | 4.20s | **PASS** |
| 20 | `test_prices.py` | Indicative price lookups & savings computation | 2.11s | **PASS** |
| 21 | `test_telephony.py` | Doctor follow-up voice call dispatch | 3.70s | **PASS** |
| 22 | `test_whatsapp.py` | Interactive WhatsApp reminder delivery | 3.81s | **PASS** |
| **Total** | **22 Suites** | **All 22 Suites Passed (0 Failures)** | **129.74s** | **100% PASS** |

### Frontend Verification & Production Build
- `scripts/test-dependencies.mjs`: npm audit critical=0, high=0, moderate=0. **PASS**
- `scripts/test-history-basket.mjs`: All 5 basket summation, savings calculation, and IndexedDB isolation tests passed. **PASS**
- `scripts/test-resource-cache.mjs`: All 5 deduplication, scoped caching, and invalidation tests passed. **PASS**
- `npm run build`: Compiled in 7.6s, all 10/10 routes successfully generated (Static + Dynamic SSR). **PASS**

---

## 4. Git Development Trajectory

The codebase follows a clean, senior-engineering milestone progression:
1. `57276ed` — `chore: establish baseline configuration, test runner and migration readiness`
2. `e4e2c82` — `feat(care-circle): implement passcode-based family onboarding and RBAC permissions`
3. `a115c27` — `feat(medications): implement schedule CRUD, dose adherence attribution, and durable email outbox`
4. `3e74483` — `feat(google-services): integrate Gemini 2.0 VLM, verify Google OAuth, and harden voice/maps tools`
5. `feat(accessibility): WCAG 2.2 AA senior mode, audio dose reader, and database index optimization` (Current)

---

## 5. Conclusion

CareSetu meets all technical, functional, and safety requirements specified in the PromptWars x CareSetu challenge. The system is verified, documented, and fully ready for final submission and evaluation.
