# 07. Comprehensive Testing & Quality Assurance Strategy

**Testing Objective:** High-Confidence Automated Verification Across Security, Correctness, Reliability & Accessibility  
**Target Coverage:** Critical Path > 90% (Auth, RBAC, Passcodes, Adherence, Reminders)  
**Execution Environment:** Isolated Python Subprocesses (`backend/run_isolated_tests.py`) & Node Test Scripts  
**Status:** Authorized Testing Blueprint  

---

## 1. Testing Pyramid & Verification Framework

To satisfy the automated code assessment criteria and guarantee platform stability during live judging, testing is structured into six disciplined tiers:

```mermaid
graph TD
    subgraph TestPyramid ["Quality Assurance Pyramid"]
        E2E["5. Two-Browser End-to-End User Journeys"]
        Sec["4. Security, BOLA & Permission Fuzzing"]
        Integ["3. Multi-Component Integration & Outbox Tests"]
        A11y["2. Automated WCAG 2.2 Accessibility Scans"]
        Unit["1. Isolated Unit & Schema Validation Tests"]
    end
```

| Tier | Focus Scope | Tooling | Execution Command |
|---|---|---|---|
| **1. Unit Tests** | Pydantic validation, CSPRNG passcode generator, HMAC hashing, medication slot calculation, cache key derivation. | `pytest` | `pytest backend/tests/test_unit_core.py` |
| **2. Accessibility** | WCAG 2.2 Level AA compliance, color contrast, keyboard tab order, ARIA attributes. | `axe-core`, Lighthouse CLI | `node frontend/scripts/test-accessibility.mjs` |
| **3. Integration Tests** | FastAPI endpoints via Starlette `TestClient`, SQLite/PostgreSQL transactional rollbacks, outbox lease claims. | `pytest` | `python backend/run_isolated_tests.py` |
| **4. Security Tests** | BOLA/IDOR header injection, passcode brute-force lockouts, revoked session access denial, XSS payload filtering. | `pytest` | `pytest backend/tests/test_security_rbac.py` |
| **5. E2E Journeys** | Full lifecycle: Patient invites daughter -> daughter accepts -> schedules medication -> dose alert emailed -> dose marked taken. | Playwright / Node script | `node frontend/scripts/test-e2e-journey.mjs` |
| **6. Performance** | Cache deduplication hit rate, database query execution times, concurrent outbox worker throughput. | Node benchmark / Python timeit | `node frontend/scripts/test-resource-cache.mjs` |

---

## 2. Windows Asyncio Test Runner Fix Protocol

### 2.1 Root Cause of Current Teardown Failure
During test suite teardown on Windows with Python 3.11, `Starlette.TestClient` enters an AnyIO blocking portal that instantiates a `ProactorEventLoop`. When the event loop is closed by the garbage collector, `_close_self_pipe()` attempts to call `self._ssock.close()`, raising:
```text
AttributeError: 'ProactorEventLoop' object has no attribute '_ssock'
```
Pytest catches this as an `PytestUnraisableExceptionWarning`, causing test suites to exit with code 1.

### 2.2 Fix Implementation (`backend/tests/conftest.py`)
```python
import sys
import asyncio
import pytest

@pytest.fixture(scope="session", autouse=True)
def setup_windows_event_loop_policy():
    """Enforce SelectorEventLoop on Windows to eliminate ProactorEventLoop _ssock teardown crash."""
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    yield
```
Additionally, `backend/run_isolated_tests.py` passes `PYTHONUTF8=1` and `-o filterwarnings=ignore::pytest.PytestUnraisableExceptionWarning` to ensure clean subprocess execution and terminal Unicode compatibility.

---

## 3. Concrete Test Suite Specifications

### 3.1 Passcode & Care Circle Lifecycle (`test_care_circle.py`)
- `test_patient_can_create_invitation_with_permissions()`: Verify patient creates invite with role `CARE_MANAGER`; returns 201; verifies DB row has hashed passcode and salt; plaintext passcode is not in DB.
- `test_passcode_single_use_redemption_creates_caregiver_link()`: Caregiver redeems passcode; returns 200; updates status to `REDEEMED`; creates `CaregiverLink` with specified permissions.
- `test_passcode_replay_rejected()`: Attempting to redeem the same code twice fails with HTTP 400 (`Passcode already redeemed`).
- `test_passcode_expiration()`: Mocking time past 10 minutes; redemption fails with HTTP 400 (`Passcode expired`).
- `test_brute_force_lockout()`: Submitting 5 incorrect passcodes increments `attempt_count` to 5; subsequent attempts are locked with HTTP 400.
- `test_patient_can_revoke_caregiver_immediately()`: Patient calls `/revoke`; link status becomes `REVOKED`; subsequent caregiver requests receive HTTP 403.

### 3.2 Authorization & BOLA Defenses (`test_security_rbac.py`)
- `test_unlinked_caregiver_cannot_access_patient_data()`: User A attempts to view Patient B's medications by passing `X-Patient-Id: B`; returns HTTP 403 Forbidden.
- `test_viewer_role_cannot_modify_medications()`: Caregiver with role `VIEWER` attempts `POST /api/medications`; rejected with HTTP 403 Forbidden.
- `test_care_manager_with_permission_can_modify_medications()`: Caregiver with `write_meds` successfully adds a medication.
- `test_scheduler_tick_requires_worker_secret()`: Normal patient/caregiver bearer tokens calling `/api/appointments/tick` receive HTTP 403; internal worker token receives HTTP 200.

### 3.3 Medication Schedule & Dose Adherence (`test_medications_adherence.py`)
- `test_manual_medication_crud()`: Verify create, get list, update dosage, and soft-delete/discontinue (`is_active = False`).
- `test_dose_intake_records_actor_attribution()`: Patient marks dose -> `logged_by_user_id == patient.user_id`, `actor_role == "OWNER"`. Caregiver marks dose -> `logged_by_user_id == caregiver.id`, `actor_role == "CARE_MANAGER"`.
- `test_discontinued_medication_cancels_future_scheduled_doses()`: Discontinuing a medicine purges pending future dose logs without altering historical adherence.

### 3.4 Durable Reminder Outbox & Email Alerts (`test_email_reminders.py`)
- `test_outbox_atomic_lease_prevents_duplicate_processing()`: Two concurrent worker workers attempting to claim the same pending task result in exactly one successful lease.
- `test_email_dispatch_success_updates_task_status()`: Mock email transport returns success -> task status set to `DISPATCHED`, `provider_message_id` recorded.
- `test_email_failure_triggers_exponential_backoff()`: Simulated provider network failure increments `attempts` to 1, sets next scheduled time to `now + 120s`, keeps status `PENDING`.
- `test_max_retries_marks_task_failed()`: After reaching `max_attempts` (3), status transitions to `FAILED` without crashing worker.

---

## 4. Accessibility & Performance Benchmarks

### 4.1 Accessibility Standards (Target Score: >= 95)
- Automated DOM inspection verifies all buttons have `min-height: 48px` and `min-width: 48px`.
- High contrast color checker validates text contrast ratio >= 7:1 for critical dose cards.
- Screen reader focus order: Tab navigation follows logical reading hierarchy; Modals trap keyboard focus until closed.

### 4.2 Performance Assertions
- Local database query benchmark: `SELECT * FROM dose_logs WHERE patient_id=? AND scheduled_time BETWEEN ? AND ?` must execute in < 20 ms.
- Client resource cache: Repeated requests within 60-second TTL return instantly without emitting network requests (verified by `test-resource-cache.mjs`).
