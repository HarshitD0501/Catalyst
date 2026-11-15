# 05. Comprehensive Gap Analysis & Remediation Priorities

**Analysis Scope:** Complete Catalyst Codebase vs Hackathon Problem Statement & Rubric  
**Prioritization Standard:** P0 (Core Blocker / Security Critical) | P1 (Platform Scoring / Usability) | P2 (Innovation & Polish)  
**Status:** Gap Identification & Remediation Blueprint  

---

## 1. Executive Gap Summary

While Catalyst contains initial scaffolding (FastAPI backend, Next.js frontend, SQLite/PostgreSQL schema, prescription upload UI, and catalog matching), **three critical gaps prevent immediate hackathon submission**:

1. **Complete Absence of Passcode Family Access (P0):** The problem statement explicitly requires "secure, passcode-based access" for family and caretakers. Currently, no invitation entity, code generator, or redemption endpoint exists.
2. **Complete Absence of Transactional Email Alerts (P0):** The challenge explicitly mandates "proactive email reminders for missed medications, upcoming doses, and medical appointments." Currently, only WhatsApp and phone call channels are stubbed; email sending is entirely missing.
3. **Flawed Authorization & Client-Controlled Scoping (P0):** Endpoints accept `X-Patient-Id` without verifying whether an active, non-revoked caregiver link exists, exposing cross-patient records (BOLA / IDOR).

---

## 2. Detailed Gap Analysis Matrix

| Gap ID | Problem Statement Requirement | Current Implementation in Catalyst | Severity | Affected Files | Proposed Remediation Plan |
|---|---|---|---|---|---|
| **GAP-01** | Secure, passcode-based family/caregiver access. | No invitation table, passcode generation, or redemption endpoint. Only static unverified linking. | **P0 CRITICAL** | `backend/app/main.py`<br>`backend/app/models.py`<br>`frontend/components/Dashboard.js` | Create `invitations` table with HMAC-SHA256 hashed 8-digit passcodes, 10-min TTL, atomic redemption, and Care Circle UI modal. |
| **GAP-02** | Proactive transactional email reminders. | Outbox processor only checks `"WHATSAPP"` and `"CALL"`. Zero email transport logic. | **P0 CRITICAL** | `backend/app/scheduler.py`<br>`backend/app/config.py`<br>`backend/app/email_sender.py` | Add `channel == "EMAIL"` processor supporting SMTP / Resend API, HTML templates for upcoming doses, missed doses, and appointments. |
| **GAP-03** | Granular permission-controlled caregiver access. | Binary `CaregiverLink` existence. No permissions column. Caregiver can perform all actions or none. | **P0 CRITICAL** | `backend/app/main.py`<br>`backend/app/v1_router.py` | Add `role` (`CARE_MANAGER`, `VIEWER`), `permissions` JSON array, and `status`/`revoked_at` to `CaregiverLink`. Enforce in dependency. |
| **GAP-04** | Dose adherence tracking with actor attribution. | `DoseLog` table records status (`taken`/`skipped`) but lacks `logged_by_user_id` and role context. | **P0 CRITICAL** | `backend/app/main.py`<br>`backend/app/models.py`<br>`frontend/components/Dashboard.js` | Extend `DoseLog` with `logged_by_user_id` and `actor_role`. Display clear attribution ("Confirmed by Daughter (Caregiver)"). |
| **GAP-05** | Direct Medication CRUD (Add / Edit / Stop). | Medications only created via prescription OCR confirmation. No standalone manual CRUD. | **P0 HIGH** | `backend/app/main.py`<br>`frontend/components/Dashboard.js` | Build explicit RESTful `/api/medications` endpoints (Create, Read, Update, Discontinue) with dose slot regeneration. |
| **GAP-06** | Machine-to-machine scheduler endpoint security. | `POST /api/appointments/tick` is callable by any authenticated normal user. | **P0 HIGH** | `backend/app/v1_router.py` | Require `Authorization: Bearer <WORKER_SECRET>` header; deny standard user tokens with HTTP 403 Forbidden. |
| **GAP-07** | Automated test suite execution on Windows. | Python 3.11 `ProactorEventLoop` socket cleanup causes unraisable exception during test teardown. | **P0 HIGH** | `backend/tests/conftest.py`<br>`backend/run_isolated_tests.py` | Configure `WindowsSelectorEventLoopPolicy` in pytest root fixture and isolate Starlette TestClient lifespan. |
| **GAP-08** | Elderly-first accessibility (WCAG 2.2 Level AA). | Generic web styling. Buttons have small click targets (32px), muted gray text contrast (3.1:1). | **P1 MEDIUM** | `frontend/components/ui.js`<br>`frontend/components/Dashboard.js` | Enforce min 48x48px touch targets, 7:1 high contrast mode, ARIA live regions for dose updates, and font size toggle. |
| **GAP-09** | Modern Google Services integration. | Uses deprecated legacy Google SDK calls; unverified live Google OAuth token validation. | **P1 MEDIUM** | `backend/app/preprocessor.py`<br>`agent/chat.py` | Upgrade to modern `google-genai` SDK (`gemini-2.0-flash` / `gemini-1.5-pro`) with structured JSON response schema. |
| **GAP-10** | Secure session management (Cookies vs LocalStorage). | JWT/HMAC bearer tokens stored in browser `localStorage`. Vulnerable to XSS token theft. | **P1 MEDIUM** | `frontend/lib/api.js`<br>`backend/app/main.py` | Issue `Set-Cookie` with `HttpOnly; Secure; SameSite=Lax` for browser clients; retain Bearer header for API workers. |
| **GAP-11** | Unconfirmed prescription review isolation. | Uploading a prescription creates draft records that occasionally leak into active schedules. | **P1 MEDIUM** | `backend/app/main.py` | Strictly isolate draft prescriptions in `review_status == 'pending'` until patient clicks explicit confirmation button. |
| **GAP-12** | Multilingual audio dose readout (Hindi/English). | Voice agent is conversational but does not offer one-click audio playback of daily dosage instructions. | **P2 LOW** | `frontend/components/Dashboard.js`<br>`agent/voice.py` | Add simple Web Speech API / TTS audio playback button next to each medication card for illiterate/low-vision seniors. |

---

## 3. Prioritized Remediation Roadmap Overview

```mermaid
timeline
    title Catalyst Implementation Progression
    Phase 1 (11:00 - 12:15) : Environment Baseline : Windows Test Runner Fix : PostgreSQL Migration Readiness
    Phase 2 (12:15 - 13:00) : Passcode Engine : Care Circle Modal : Zero-Trust RBAC & IDOR Fixes
    Phase 3 (13:00 - 13:45) : Manual Medication CRUD : Dose Actor Attribution : Durable Transactional Email Outbox
    Phase 4 (13:45 - 14:30) : Google Gemini VLM Upgrade : Live Google OAuth : Voice & Maps Hardening
    Phase 5 (14:30 - 15:15) : WCAG 2.2 AA Accessibility : Performance Tuning : CI/CD & Final Submission Verification
```
