# 04. Target Architecture & Data Model Design

**Architecture Paradigm:** Clean Modular Monolith with Decoupled Background Workers  
**Core Technologies:** Next.js 15 (App Router), FastAPI 0.115, SQLAlchemy 2.0 / PostgreSQL, LiveKit Agents SDK, Gemini 2.0 / 1.5 Pro  
**Design Patterns:** Outbox Pattern for Durable Reminders, Repository / Service Layer, Strict RBAC Dependency Injection  
**Status:** Architecture Blueprint  

---

## 1. System Topology & Data Flow

The target Catalyst architecture achieves high reliability, low cognitive overhead for elderly patients, and secure family collaboration through clean service boundaries:

```mermaid
graph TB
    subgraph ClientLayer ["Client Layer (Next.js 15 App Router)"]
        ElderlyUI["Senior Portal (Simple View)"]
        CaregiverUI["Caregiver Portal (Management View)"]
        AudioUI["Live Voice Agent (WebRTC)"]
    end

    subgraph APILayer ["API & Business Logic (FastAPI 0.115)"]
        AuthSvc["Auth & Session Service"]
        CareCircleSvc["Care Circle & Invitation Service"]
        MedSvc["Medication & Schedule Service"]
        AdherenceSvc["Adherence & Dose Tracking"]
        ApptSvc["Appointment Management"]
        OCRSvc["Gemini Multimodal VLM OCR"]
    end

    subgraph DataLayer ["Persistence & Messaging"]
        Postgres[("PostgreSQL 16 / SQLite Storage")]
        OutboxTable[("reminder_tasks (Outbox Queue)")]
    end

    subgraph WorkerLayer ["Decoupled Background Workers"]
        EmailWorker["Outbox Dispatcher (Email Worker)"]
        VoiceAgent["LiveKit Python Voice Agent"]
    end

    subgraph ExternalServices ["External Infrastructure"]
        GoogleGemini["Google Gemini 2.0 / 1.5 Flash API"]
        EmailProvider["SMTP / Resend / SendGrid API"]
        LiveKitCloud["LiveKit Cloud / WebRTC SFU"]
        GoogleOAuth["Google Identity Services"]
    end

    ClientLayer -->|"HTTPS / REST"| APILayer
    AudioUI <-->|"WebRTC Media"| LiveKitCloud
    VoiceAgent <-->|"Agent RPC"| LiveKitCloud
    VoiceAgent -->|"Internal Tool Calls"| APILayer

    APILayer -->|"SQLAlchemy ORM"| Postgres
    APILayer -->|"Write Tasks"| OutboxTable
    APILayer -->|"Multimodal Ingest"| GoogleGemini
    APILayer -->|"Verify Tokens"| GoogleOAuth

    OutboxTable <-->|"Atomic Lease / Poll"| EmailWorker
    EmailWorker -->|"Deliver Transactional Alert"| EmailProvider
```

---

## 2. Relational Database Schema & Data Models

### 2.1 Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    USERS ||--o| PATIENTS : owns
    USERS ||--o{ CAREGIVER_LINKS : acts_as_caregiver
    PATIENTS ||--o{ CAREGIVER_LINKS : receives_care
    PATIENTS ||--o{ INVITATIONS : issues
    PATIENTS ||--o{ MEDICINES : prescribes
    MEDICINES ||--o{ DOSE_LOGS : tracks
    PATIENTS ||--o{ DOSE_LOGS : logs_for
    PATIENTS ||--o{ APPOINTMENTS : books
    PATIENTS ||--o{ REMINDER_TASKS : queues
    PATIENTS ||--o{ AUDIT_LOGS : logs

    USERS {
        int id PK
        string email UK
        string phone UK
        string hashed_password
        string role
        boolean is_active
        datetime created_at
    }

    PATIENTS {
        int id PK
        int user_id FK
        string full_name
        int age
        string gender
        string emergency_contact
        string primary_doctor
        string timezone
        datetime created_at
    }

    CAREGIVER_LINKS {
        int id PK
        int patient_id FK
        int caregiver_user_id FK
        string relationship
        string role
        json permissions
        string status
        datetime consent_timestamp
        datetime revoked_at
        datetime created_at
    }

    INVITATIONS {
        int id PK
        int patient_id FK
        string recipient_email
        string relationship
        string role
        json permissions
        string passcode_hash
        string passcode_salt
        datetime expires_at
        int attempt_count
        int max_attempts
        string status
        datetime created_at
        datetime redeemed_at
    }

    MEDICINES {
        int id PK
        int patient_id FK
        string name
        string dosage
        string frequency
        json times_of_day
        string instructions
        string meal_relation
        boolean is_active
        string review_status
        date start_date
        date end_date
        datetime created_at
    }

    DOSE_LOGS {
        int id PK
        int patient_id FK
        int medicine_id FK
        datetime scheduled_time
        datetime actual_time
        string status
        int logged_by_user_id FK
        string actor_role
        string notes
        datetime created_at
    }

    APPOINTMENTS {
        int id PK
        int patient_id FK
        string doctor_name
        string specialty
        string clinic_location
        datetime scheduled_time_utc
        string timezone
        string status
        string notes
        datetime created_at
    }

    REMINDER_TASKS {
        int id PK
        int patient_id FK
        string channel
        string event_type
        string recipient_email
        string recipient_phone
        json payload
        string status
        datetime scheduled_for_utc
        datetime locked_until_utc
        int attempts
        int max_attempts
        string idempotency_key UK
        string provider_message_id
        datetime created_at
        datetime updated_at
    }

    AUDIT_LOGS {
        int id PK
        int patient_id FK
        int actor_user_id FK
        string action
        string resource_type
        int resource_id
        json details
        string ip_address
        datetime timestamp
    }
```

---

## 3. Core API Specifications & Contracts

### 3.1 Care Circle & Passcode Invitations
- **POST `/api/care-circle/invitations`**
  - *Caller:* Authenticated Patient (Owner only).
  - *Request Body:*
    ```json
    {
      "recipient_email": "daughter@example.com",
      "relationship": "Daughter",
      "role": "CARE_MANAGER",
      "permissions": ["read", "write_meds", "write_adherence", "write_appointments"]
    }
    ```
  - *Response (201 Created):*
    ```json
    {
      "invitation_id": 42,
      "recipient_email": "daughter@example.com",
      "expires_at": "2026-11-15T12:00:00Z",
      "message": "Invitation created. Passcode dispatched via secure email."
    }
    ```
- **POST `/api/care-circle/redeem`**
  - *Caller:* Authenticated Caregiver User.
  - *Request Body:*
    ```json
    {
      "recipient_email": "daughter@example.com",
      "passcode": "84729103"
    }
    ```
  - *Response (200 OK):*
    ```json
    {
      "success": true,
      "patient_id": 101,
      "patient_name": "Ramesh Patel",
      "role": "CARE_MANAGER",
      "permissions": ["read", "write_meds", "write_adherence", "write_appointments"]
    }
    ```
- **POST `/api/care-circle/members/{link_id}/revoke`**
  - *Caller:* Authenticated Patient (Owner only).
  - *Response (200 OK):*
    ```json
    {
      "success": true,
      "link_id": 12,
      "status": "REVOKED",
      "revoked_at": "2026-11-15T11:50:00Z"
    }
    ```

### 3.2 Medication Schedule Management
- **GET `/api/medications`**
  - *Parameters:* `?patient_id=101` (Validated against caller permissions).
  - *Response (200 OK):* Array of active medications with dose time slots.
- **POST `/api/medications`**
  - *Caller:* Patient or Caregiver with `write_meds`.
  - *Request Body:*
    ```json
    {
      "name": "Metformin",
      "dosage": "500 mg",
      "frequency": "BID",
      "times_of_day": ["08:00", "20:00"],
      "meal_relation": "AFTER_MEAL",
      "instructions": "Take with full glass of water",
      "start_date": "2026-11-15",
      "end_date": null
    }
    ```
- **POST `/api/medications/{id}/adherence`**
  - *Caller:* Patient or Caregiver with `write_adherence`.
  - *Request Body:*
    ```json
    {
      "scheduled_time": "2026-11-15T08:00:00Z",
      "status": "TAKEN",
      "notes": "Taken on time with breakfast"
    }
    ```
  - *Response (200 OK):* Returns created `DoseLog` with `logged_by_user_id` and updated daily adherence score.

---

## 4. Durable Reminder Outbox & Background Processing

To guarantee zero lost email notifications, Catalyst implements the **Transactional Outbox Pattern**:

```mermaid
flowchart TD
    ScheduleEvent["Medication Scheduled / Appointment Created"] --> WriteOutbox["Insert reminder_tasks (status='PENDING')"]
    WriteOutbox --> CommitDB["Commit inside main DB transaction"]
    
    subgraph BackgroundWorker ["Continuous Poller / Scheduled Tick"]
        Poll["Worker polls: status='PENDING' AND scheduled_for_utc <= now()"]
        Lock["Atomic Claim: UPDATE SET status='PROCESSING', locked_until=now()+60s WHERE id=?"]
        Dispatch{"Dispatch Channel"}
        
        Dispatch -->|"channel == 'EMAIL'"| SendEmail["SMTP / Resend API Client"]
        Dispatch -->|"channel == 'WHATSAPP'"| SendWA["WhatsApp Cloud API"]
        
        SendEmail --> Success{"Send Succeeded?"}
        Success -->|"Yes"| Done["UPDATE SET status='DISPATCHED', provider_id=?"]
        Success -->|"No (Network/Auth)"| Retry{"attempts < max_attempts?"}
        Retry -->|"Yes"| Backoff["UPDATE SET status='PENDING', attempts+=1, scheduled_for=now()+2^attempts*60s"]
        Retry -->|"No"| Failed["UPDATE SET status='FAILED', error_log=?"]
    end
    
    CommitDB -.-> Poll
```

### 4.1 Worker Guarantees
1. **Idempotency:** Every task carries a deterministic `idempotency_key` (e.g., `dose:{patient_id}:{medicine_id}:{scheduled_slot_iso}`). Duplicate scheduling attempts are ignored by a database unique constraint.
2. **Crash Resilience:** If a worker crashes mid-delivery, `locked_until_utc` expires after 60 seconds, allowing another worker process to safely reclaim and dispatch the task.
3. **Auditability:** Every dispatch records the provider message ID and delivery timestamp in `reminder_tasks`.
