# 09. Deployment, Verification & Submission Protocol

**Submission Deadline:** 15:30 Asia/Kolkata (Freeze development by 14:30 for deployment & verification)  
**Target Environment:** Containerized Cloud Deployment (Google Cloud Run / Railway / Docker Compose)  
**Database:** Persistent PostgreSQL with Managed Connection Pooling  
**Status:** Deployment Architecture & Submission Protocol  

---

## 1. Target Deployment Topologies

To guarantee zero deployment blockers during the final judging window, Catalyst specifies two robust deployment topologies:

### 1.1 Option A: Google Cloud Run (Recommended for Google Hackathon)
- **Frontend Container:** Next.js standalone server deployed on Cloud Run (`catalyst-frontend`).
- **Backend API Container:** FastAPI application server deployed on Cloud Run (`catalyst-backend`).
- **Database:** Google Cloud SQL (PostgreSQL 16) or Supabase managed PostgreSQL connected via Cloud SQL Auth Proxy / direct pooler.
- **Background Worker:** Continuously running Cloud Run service or Cloud Scheduler triggering authenticated `/api/workers/process-reminders` endpoint every 1 minute.
- **AI Infrastructure:** Google AI Studio / Vertex AI Gemini API endpoint with credentials stored in Secret Manager.

### 1.2 Option B: Unified Multi-Container Production Docker Compose
- Used for single-VM / VPS deployment (Railway / Render / Hetzner):
  ```yaml
  version: "3.8"
  services:
    db:
      image: postgres:16-alpine
      environment:
        POSTGRES_DB: catalyst_prod
        POSTGRES_USER: catalyst_user
        POSTGRES_PASSWORD: ${DB_PASSWORD}
      volumes:
        - pgdata:/var/lib/postgresql/data
      restart: always

    backend:
      build: ./backend
      command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
      environment:
        DATABASE_URL: postgresql://catalyst_user:${DB_PASSWORD}@db:5432/catalyst_prod
        WORKER_SECRET_KEY: ${WORKER_SECRET_KEY}
        GEMINI_API_KEY: ${GEMINI_API_KEY}
        SMTP_HOST: ${SMTP_HOST}
        SMTP_USER: ${SMTP_USER}
        SMTP_PASS: ${SMTP_PASS}
      depends_on:
        - db
      restart: always

    frontend:
      build: ./frontend
      ports:
        - "3000:3000"
      environment:
        NEXT_PUBLIC_BACKEND_URL: http://backend:8000
      depends_on:
        - backend
      restart: always

  volumes:
    pgdata:
  ```

---

## 2. Environment Configuration & Secret Hygiene

### 2.1 Production Variable Checklist (`.env.production`)
| Variable | Required Scope | Sensitivity | Description |
|---|---|---|---|
| `DATABASE_URL` | Backend / Worker | High Secret | `postgresql://user:pass@host:5432/catalyst_prod` |
| `SECRET_KEY` | Backend | High Secret | 64-byte hex string for session token HMAC signing. |
| `WORKER_SECRET_KEY` | Backend / Worker | High Secret | Shared machine token for scheduler worker authentication. |
| `GEMINI_API_KEY` | Backend | High Secret | Google AI Studio API key for Gemini 2.0 / 1.5 Pro multimodal OCR. |
| `GOOGLE_CLIENT_ID` | Backend / Frontend | Public | Google OAuth 2.0 Client ID for identity verification. |
| `SMTP_HOST` | Backend | Medium | Mail server host (e.g., `smtp.resend.com` or `smtp.sendgrid.net`). |
| `SMTP_PORT` | Backend | Low | SMTP port (`587` for TLS / `465` for SSL). |
| `SMTP_USER` | Backend | Medium | Mail server username / API key identifier. |
| `SMTP_PASS` | Backend | High Secret | SMTP password / API secret key. |
| `EMAIL_FROM_ADDRESS` | Backend | Medium | Verified sender address (e.g., `reminders@catalyst-care.com`). |
| `LIVEKIT_URL` | Agent / Backend | Medium | WebRTC signaling server URL (`wss://...`). |
| `LIVEKIT_API_KEY` | Agent / Backend | High Secret | LiveKit room generation key. |
| `LIVEKIT_API_SECRET` | Agent / Backend | High Secret | LiveKit room generation secret. |

---

## 3. Platform Scoring Pre-Flight Audit Checklist

Before initiating the final submission attempt, verify every platform signal:

```markdown
### Automated Code Assessment Checklist
- [ ] **Code Quality:**
  - [ ] Zero syntax errors, circular imports, or unhandled promise rejections.
  - [ ] Zero committed credentials or hardcoded API keys in Git tracking.
  - [ ] All API responses return consistent JSON error envelopes (`{"detail": "..."}`).
- [ ] **Security:**
  - [ ] RBAC enforced: Viewer role denied write access (HTTP 403 verified).
  - [ ] BOLA/IDOR defended: Manipulating `X-Patient-Id` cannot access unlinked records.
  - [ ] Passcodes stored as HMAC-SHA256 hashes with salts; 10-minute expiry active.
  - [ ] CORS origins explicitly restricted to deployment domains.
- [ ] **Efficiency:**
  - [ ] Database indexes present on `(patient_id, scheduled_time)` and `reminder_tasks`.
  - [ ] Frontend resource cache deduplicates in-flight calls (`test-resource-cache.mjs` PASS).
  - [ ] API p95 query latency < 50ms on local test workloads.
- [ ] **Testing:**
  - [ ] `backend/run_isolated_tests.py` passes 100% green with exit code 0.
  - [ ] Frontend tests (`test-history-basket.mjs`, `test-resource-cache.mjs`) pass.
- [ ] **Accessibility:**
  - [ ] Senior UI touch targets >= 48x48px across all dose confirmation buttons.
  - [ ] Contrast ratio >= 7:1 for vital alerts and medication names.
  - [ ] ARIA live announcements on dose state mutations.
- [ ] **Problem Statement Alignment:**
  - [ ] Shared Profile, Passcode Invitations, Medication CRUD, Dose Adherence, Email Alerts all verified live.
- [ ] **Google Services Usage:**
  - [ ] Gemini 2.0 / 1.5 Pro multimodal VLM extracts real prescription image.
  - [ ] Google OAuth verified in authentication flow.
```

---

## 4. Live Incognito 2-Browser Demonstration Script

Follow this precise sequence during the live judging demonstration or video recording:

1. **Window A (Patient - Senior Mode):**
   - Log in as elderly patient (Ramesh Patel).
   - Display the clean, high-contrast "Senior Simple View".
   - Open "Care Circle" modal -> click "Invite Family Member".
   - Enter daughter's email (`anita@example.com`), relation "Daughter", role "Care Manager".
   - Click "Send Invitation". System generates 8-digit passcode.
2. **Window B (Caregiver - Private Incognito Window):**
   - Log in / register as Anita.
   - Click "Accept Family Invitation".
   - Enter email and the 8-digit passcode.
   - Click "Redeem Passcode". Access granted immediately.
   - Observe Caregiver portal switching to Ramesh's healthcare profile.
3. **Collaborative Action & Medication Schedule (Window B):**
   - As Caregiver, click "Add Medication".
   - Enter "Amlodipine 5mg", Once daily (Morning 09:00 AM). Save.
   - Trigger transactional email reminder -> verify email arrives in inbox.
4. **Adherence Logging (Window A):**
   - Refresh or observe real-time update on Ramesh's Senior View.
   - Click large "Mark Morning Dose Taken" button.
   - Verify audio chime / live ARIA announcement.
   - Return to Window B -> observe adherence score update with attribution: *"Confirmed by Ramesh (Self)"*.
5. **Security & Revocation Proof (Window A):**
   - Ramesh opens Care Circle -> clicks "Revoke Access" for Anita.
   - Window B attempts to edit appointment -> immediately blocked with HTTP 403 Forbidden.
   - Zero-trust security cleanly proven to judges.
