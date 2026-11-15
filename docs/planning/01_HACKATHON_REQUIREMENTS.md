# 01. Hackathon Requirements & Verification Matrix

**Project:** Catalyst — Intelligent Elderly Care & Family Coordination Platform  
**Challenge:** Elderly Care & Medication Management Platform  
**Event:** PromptWars x Catalyst | Build with AI (Google for Developers, H2S, MnM Works)  
**Target Submission Window:** 15:30 Asia/Kolkata (November 15, 2026)  
**Status:** Baseline Verified | Planning Stage (Phase-Gated)  

---

## 1. Challenge Overview & Problem Statement

### 1.1 Official Challenge Description
> "Develop a smart, interconnected healthcare management platform designed to help elderly individuals manage their daily medications, medical appointments, and healthcare routines while keeping their family members and caretakers informed.
>
> The platform should provide a shared ecosystem where elderly individuals, caretakers, and family members can access and manage an elderly person's healthcare profile through secure, passcode-based access. Authorized members should be able to view, add, edit, and manage medication schedules, track adherence, and monitor upcoming doctor appointments.
>
> The system should proactively send email reminders for missed medications, upcoming doses, and medical appointments, ensuring that important healthcare routines are never overlooked.
>
> The challenge is to go beyond a basic reminder application. Think creatively and develop innovative ways to make elderly care smarter, more accessible, reliable, and collaborative, while ensuring that elderly individuals remain at the centre of their own healthcare decisions."

### 1.2 Core Product Pillars
1. **Patient-Centric Empowerment:** The elderly individual maintains sovereignty over their healthcare profile, granting, modifying, and revoking family/caregiver access at will.
2. **Shared Family Ecosystem:** Multi-member care circle with role-appropriate permissions (Care Manager vs Family Viewer) accessing a unified, real-time healthcare profile.
3. **Passcode-Based Access Control:** Secure, zero-trust invitation and redemption system for family members and caregivers without relying on vulnerable static credentials.
4. **End-to-End Medication Management:** Comprehensive lifecycle covering prescription ingestion (OCR/Gemini), manual medication addition/editing/discontinuation, daily scheduling, and verified dose adherence logging.
5. **Durable, Multi-Channel Proactive Reminders:** Mandatory transactional email alerts (upcoming doses, missed doses, doctor appointments) backed by an atomic, idempotent outbox pattern.
6. **Elderly-First Accessibility:** Interfaces tailored for aging eyes, motor tremors, and cognitive fatigue (high contrast, WCAG 2.2 touch targets, bilingual English/Hindi support, audio alternatives).
7. **Google Cloud & AI Integration:** Production-grade use of Google Gemini VLM for multimodal prescription parsing and Google OAuth identity verification.

---

## 2. Evaluation Framework & Scoring Criteria

Platform scoring is automated on the challenge infrastructure. Only the final submission score for each phase is recorded; previous attempt scores are superseded.

| Evaluation Category | Evaluation Focus & Signals | Platform Verification Strategy |
|---|---|---|
| **1. Code Quality** | Modular design, separation of concerns, strong typing/validation, zero dead code, clean error handling, absence of hardcoded secrets. | Linter passes, PEP8/ESLint compliance, zero AST syntax violations, type hints. |
| **2. Security** | Zero-Trust RBAC, strict BOLA/IDOR prevention, cryptographic passcode hashing, secure cookie/session tokens, rate limiting, audit trails. | Automated security scans, unauthorized endpoint probe testing, SQL injection and XSS fuzzing. |
| **3. Efficiency** | Optimized database queries (avoiding N+1), index utilization, memory caching, client-side request deduplication, bundle size minimization. | API latency benchmarks (<100ms p95 for local DB queries), query count assertions, cache hit ratios. |
| **4. Testing** | Unit, integration, authorization regression, and end-to-end tests; deterministic mocking; high branch coverage on core logic. | Automated test suite execution (`pytest`, `node`), exit code 0 requirement, test isolation without state leakage. |
| **5. Accessibility** | WCAG 2.2 Level AA compliance, minimum 44x44px touch targets, color contrast ratios >= 4.5:1, keyboard navigation, ARIA live regions. | Automated axe-core / Lighthouse accessibility audits (target score >= 95). |
| **6. Problem Statement Alignment** | Faithful implementation of all 10 core requirements: shared profiles, passcodes, schedules, adherence, email alerts, appointments. | Feature existence checks, workflow integration tests, end-to-end scenario validation. |
| **7. Google Services Usage** | Substantive, working integration of Google developer technologies: Gemini 2.0/1.5 API for multimodal vision/reasoning and Google OAuth. | Real provider request execution, valid API contract schema handling, verified auth callback pipeline. |

---

## 3. Comprehensive Requirements Traceability Matrix

This matrix maps every explicit and implicit requirement from the problem statement to the current Catalyst state, identified technical gaps, planned remediation, and verification criteria.

| ID | Requirement Specification | Current State in Catalyst | Severity / Gap | Planned Engineering Fix | Verification Test |
|---|---|---|---|---|---|
| **REQ-01** | **Shared Healthcare Profile**<br>Unified profile accessible by patient and authorized circle. | Basic `Patient` model exists; links via `CaregiverLink` table; UI has `Dashboard.js` and `Caregiver.js`. | **P0 GAP:** Actor resolution leaks client-side `X-Patient-Id`; lacks role-based views. | Enforce server-side actor resolution (`resolve_actor`), bind context to verified database session, create unified shared profile view. | `test_caregiver_patient_scoping.py`<br>`test_unlinked_access_denied` |
| **REQ-02** | **Passcode-Based Family Access**<br>Secure, single-use, time-bounded code to onboard family. | **ABSENT:** No passcode generation, invitation table, or redemption endpoint. Only static link creation. | **P0 CRITICAL:** Zero-trust invitation flow is completely missing. | Build `invitations` table, HMAC-SHA256 hashed 8-digit CSPRNG passcode, 10-min expiry, max 5 attempts, atomic redemption endpoint. | `test_invitation_lifecycle.py`<br>`test_passcode_brute_force_rate_limit` |
| **REQ-03** | **Permission-Controlled Access**<br>Granular rights (Owner vs Care Manager vs Viewer). | Partial: `CaregiverLink` only has binary link; no permission flags; caregiver can trigger everything. | **P0 CRITICAL:** Privilege escalation possible; no read-only viewer role. | Add `permissions` (BITMASK or JSON: `read`, `write_meds`, `write_adherence`, `write_appointments`) and `status`/`revoked_at`. | `test_permission_matrix.py`<br>`test_viewer_write_forbidden` |
| **REQ-04** | **Medication Schedule CRUD**<br>View, add, edit, reschedule, and discontinue medications. | Partial: Meds created via prescription OCR review; manual add/edit is incomplete or coupled to OCR drafts. | **P0 GAP:** Caregiver/patient cannot manually create or modify a dosage schedule directly. | Expose clean RESTful `/api/medications` CRUD; handle dose slot recalculation, frequency strings, and discontinuation. | `test_medication_crud.py`<br>`test_discontinue_invalidates_doses` |
| **REQ-05** | **Adherence Tracking & History**<br>Log dose intake with actor attribution and timestamping. | `DoseLog` records `status` (taken/skipped) but lacks actor attribution; anyone can mark without proof. | **P0 GAP:** Missing audit trail of *who* marked the dose (patient vs caregiver vs automated call). | Extend `dose_logs` with `logged_by_user_id`, `actor_role`, and client timestamp normalization; real-time adherence calculation. | `test_adherence_actor_attribution.py`<br>`test_adherence_percentage_calc` |
| **REQ-06** | **Upcoming & Missed Reminders**<br>Proactive alerting logic for pending and neglected doses. | `scheduler.py` has `tick_reminder_tasks` for WhatsApp; no dedicated missed-dose escalation. | **P1 GAP:** Missed doses are logged but do not trigger progressive notifications. | Implement 3-tier escalation: 15 min prior (upcoming), 30 min post (overdue), 60 min post (caregiver escalation). | `test_scheduler_escalation.py`<br>`test_reminder_grace_period` |
| **REQ-07** | **Appointment Management**<br>Doctor visits scheduling, doctor details, and status tracking. | Basic `Appointment` model in `main.py` and `scheduler.py`; lacks caregiver write verification and UI polish. | **P1 GAP:** Clinic details, reschedule preference flow disconnected from patient calendar. | Add doctor specialty, location, notes, and strict ownership validation on creation; wire frontend calendar modal. | `test_appointment_lifecycle.py`<br>`test_cross_patient_appointment_leak` |
| **REQ-08** | **Proactive Email Reminders**<br>Mandatory transactional emails for doses, missed meds, appointments. | **ABSENT:** No email sending pipeline. Only WhatsApp/telephony stubs exist. | **P0 CRITICAL:** Core problem statement requirement explicitly mandates email alerts. | Implement durable Email Outbox in `reminder_tasks` (`channel='EMAIL'`), background processor with retry backoff and SMTP/API client. | `test_email_outbox_dispatch.py`<br>`test_email_template_rendering` |
| **REQ-09** | **Elderly Accessibility (WCAG 2.2)**<br>Senior-friendly UI with high contrast, large targets, audio. | Basic responsive Tailwind UI; button sizes vary; language toggle exists (En/Hi) but text contrast is unverified. | **P1 GAP:** Small click targets (32px), low contrast muted text, missing ARIA live regions for dose updates. | Implement Elderly UI Mode (min 48px touch targets, 7:1 contrast, font scale toggle, bilingual Hindi/English speech). | `axe-core` automated audit<br>`test_keyboard_navigation` |
| **REQ-10** | **Google Services Integration**<br>Deep integration of Gemini VLM & Google OAuth. | Legacy Gemini prompt in `preprocessor.py` and `agent/chat.py`; Google OAuth mocked in tests. | **P0 GAP:** Uses legacy deprecated Google SDK calls; unverified live token validation. | Upgrade to `google-genai` SDK (`gemini-2.0-flash` / `gemini-1.5-pro`) for multimodal prescription OCR and structured JSON schema extraction. | `test_gemini_multimodal_ocr.py`<br>`test_google_oauth_token_validation` |

---

## 4. Hackathon Rules & Policy Compliance

### 4.1 Codebase Reuse & Intellectual Property
- **Architecture Design:** Built as a modern, decoupled modular architecture designed specifically for the elderly care challenge.
- **Rule Verification:** The hackathon encourages rapid development on modern AI stacks. Reusing architectural patterns is standard provided all problem statement requirements are genuinely implemented, security vulnerabilities are remediated, and no fabricated outcomes are presented.
- **Strict Prohibition Against Simulation:** All automated testing, email delivery, database records, and AI inference must be functional and auditable. Mocking is restricted to external network boundary failures during unit test suites.

### 4.2 Submission Requirements Checklist
1. **Source Code Repository:** Public or reviewer-accessible Git repository containing full frontend, backend, agent, and database migrations.
2. **Environment Configuration:** Comprehensive `.env.example` with documented configuration keys and zero committed secrets.
3. **Automated Verification:** One-line test runner (`backend/run_isolated_tests.py` and frontend test scripts) passing 100% green without flaky timeouts.
4. **Deployed Live URL:** Containerized, HTTPS-accessible deployment (Cloud Run / Railway / Node + FastAPI).
5. **Demonstration Video:** 3-5 minute video demonstrating:
   - Patient creating an invitation with a secure 8-digit passcode.
   - Caregiver redeeming the passcode in a separate incognito browser session.
   - Caregiver viewing shared profile with appropriate RBAC limitations.
   - Adding and scheduling a medication manually.
   - Gemini multimodal prescription scan and structured extraction.
   - Immediate triggering and receipt of a transactional email reminder.
   - Marking a dose taken and observing real-time adherence rate updates.
