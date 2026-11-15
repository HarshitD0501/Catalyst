"""Integration Test Suite for Medication CRUD, Dose Adherence Attribution & Durable Email Reminders (Phase 3)."""
import asyncio
import os
import random
import shutil
import tempfile
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app import email_sender
from app.auth import make_token
from app.db import SessionLocal, init_db
from app.main import app
from app.models import CaregiverLink, DoseAdherence, Medicine, Patient, ReminderLog, ReminderTask
from app.scheduler import claim_due_tasks, process_reminder_task, schedule_missed_dose_alerts


def _rand_phone():
    return f"98{random.randint(10000000, 99999999)}"


@pytest.fixture(autouse=True)
def clean_email_history():
    """Clear in-memory simulated email history between test runs."""
    email_sender.clear_sent_emails()
    yield
    email_sender.clear_sent_emails()


def test_manual_medication_crud_and_schedule_sync():
    """Verify manual medication creation, update, schedule slot generation, and discontinuation."""
    with TestClient(app) as client:
        # 1. Register a test patient
        reg = client.post(
            "/api/auth/register",
            json={
                "name": "Ramesh Kumar",
                "email": f"ramesh_{os.urandom(4).hex()}@example.com",
                "phone": _rand_phone(),
                "password": "Password123!",
            },
        )
        assert reg.status_code == 201
        token = reg.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        patient_id = reg.json()["patient"]["id"]

        # 2. Create medication manually
        create_res = client.post(
            "/api/medications",
            headers=headers,
            json={
                "brand": "Glycomet GP 1",
                "salt": "Glimepiride + Metformin",
                "strength": "1mg/500mg",
                "form": "tablet",
                "dosage_notation": "1-0-1",
                "instructions": "Take after meals",
                "duration_days": 30,
            },
        )
        assert create_res.status_code == 201, create_res.text
        med_data = create_res.json()
        assert med_data["brand"] == "Glycomet GP 1"
        assert med_data["status"] == "active"
        assert "morning" in med_data["timing"]
        assert "night" in med_data["timing"]
        med_id = med_data["id"]

        # 3. Verify today's adherence dose slots were generated automatically
        adh_res = client.get("/api/adherence/today", headers=headers)
        assert adh_res.status_code == 200
        doses = adh_res.json()
        med_doses = [d for d in doses if d["medicine_id"] == med_id]
        assert len(med_doses) == 2, f"Expected 2 slots for 1-0-1, got {len(med_doses)}"
        slots = {d["slot"] for d in med_doses}
        assert slots == {"morning", "night"}

        # 4. Update medication details
        update_res = client.put(
            f"/api/medications/{med_id}",
            headers=headers,
            json={
                "strength": "2mg/500mg",
                "instructions": "Take immediately after breakfast and dinner",
            },
        )
        assert update_res.status_code == 200
        assert update_res.json()["strength"] == "2mg/500mg"

        # 5. Discontinue medication
        del_res = client.delete(f"/api/medications/{med_id}", headers=headers)
        assert del_res.status_code == 200
        assert del_res.json()["status"] == "stopped"

        # Verify active medicines list excludes discontinued medicine
        list_res = client.get("/api/medications", headers=headers)
        assert list_res.status_code == 200
        active_ids = [m["id"] for m in list_res.json()]
        assert med_id not in active_ids


def test_dose_adherence_checkin_and_actor_attribution():
    """Verify dose check-in attribution (patient vs caregiver) and RBAC write permissions."""
    with TestClient(app) as client:
        # Register Elderly Patient
        p_reg = client.post(
            "/api/auth/register",
            json={
                "name": "Savitri Devi",
                "email": f"savitri_{os.urandom(4).hex()}@example.com",
                "phone": _rand_phone(),
                "password": "Password123!",
            },
        )
        p_token = p_reg.json()["token"]
        p_headers = {"Authorization": f"Bearer {p_token}"}
        p_id = p_reg.json()["patient"]["id"]

        # Register Caregiver
        cg_reg = client.post(
            "/api/auth/register",
            json={
                "name": "Ananya Sharma",
                "email": f"ananya_{os.urandom(4).hex()}@example.com",
                "phone": _rand_phone(),
                "password": "Password123!",
                "role": "caregiver",
            },
        )
        cg_token = cg_reg.json()["token"]
        cg_headers = {"Authorization": f"Bearer {cg_token}"}
        cg_id = cg_reg.json()["patient"]["id"]

        # Link Caregiver as CARE_MANAGER with write_adherence
        db = SessionLocal()
        try:
            link = CaregiverLink(
                caregiver_id=cg_id,
                patient_id=p_id,
                role="CARE_MANAGER",
                permissions='["read", "write_meds", "write_adherence", "write_appointments"]',
                status="ACTIVE",
            )
            db.add(link)
            db.commit()
        finally:
            db.close()

        # Add medication for patient
        med_res = client.post(
            "/api/medications",
            headers=p_headers,
            json={
                "brand": "Thyronorm 50",
                "dosage_notation": "1-0-0",
                "timing": ["morning"],
            },
        )
        assert med_res.status_code == 201

        # Fetch scheduled dose slot
        adh_res = client.get("/api/adherence/today", headers=p_headers)
        assert adh_res.status_code == 200
        slot_id = adh_res.json()[0]["id"]

        # 1. Caregiver logs dose as taken
        checkin_res = client.post(
            f"/api/adherence/{slot_id}/check-in",
            headers=cg_headers,
            json={
                "status": "taken",
                "notes": "Administered with morning glass of water",
            },
        )
        assert checkin_res.status_code == 200, checkin_res.text
        data = checkin_res.json()
        assert data["adherence"]["status"] == "taken"
        assert data["adherence"]["logged_by_user_id"] == cg_id
        assert data["adherence"]["actor_role"] == "CARE_MANAGER"
        assert data["stats"]["adherence_rate_today_pct"] == 100

        # 2. Test Viewer restriction: Change link role to VIEWER without write_adherence
        db = SessionLocal()
        try:
            db_link = db.query(CaregiverLink).filter_by(caregiver_id=cg_id, patient_id=p_id).first()
            db_link.role = "VIEWER"
            db_link.permissions = '["read"]'
            db.commit()
        finally:
            db.close()

        # Viewer attempt to modify adherence should return HTTP 403 Forbidden
        viewer_res = client.post(
            f"/api/adherence/{slot_id}/check-in",
            headers=cg_headers,
            json={"status": "missed"},
        )
        assert viewer_res.status_code == 403


def test_missed_dose_email_outbox_and_dispatch():
    """Verify missed dose triggers email outbox task, which scheduler claims and dispatches."""
    with TestClient(app) as client:
        # Register Patient with Email
        p_email = f"patient_{os.urandom(4).hex()}@example.com"
        p_reg = client.post(
            "/api/auth/register",
            json={
                "name": "Harish Patel",
                "email": p_email,
                "phone": _rand_phone(),
                "password": "Password123!",
            },
        )
        p_token = p_reg.json()["token"]
        p_headers = {"Authorization": f"Bearer {p_token}"}
        p_id = p_reg.json()["patient"]["id"]

        # Register Caregiver with Email
        cg_email = f"caregiver_{os.urandom(4).hex()}@example.com"
        cg_reg = client.post(
            "/api/auth/register",
            json={
                "name": "Pooja Patel",
                "email": cg_email,
                "phone": _rand_phone(),
                "password": "Password123!",
                "role": "caregiver",
            },
        )
        cg_id = cg_reg.json()["patient"]["id"]

        # Link Caregiver
        db = SessionLocal()
        try:
            link = CaregiverLink(
                caregiver_id=cg_id,
                patient_id=p_id,
                role="CARE_MANAGER",
                permissions='["read", "write_adherence"]',
                status="ACTIVE",
            )
            db.add(link)
            db.commit()
        finally:
            db.close()

        # Add medication
        client.post(
            "/api/medications",
            headers=p_headers,
            json={
                "brand": "Cardace 5",
                "strength": "5mg",
                "timing": ["morning"],
            },
        )

        adh_res = client.get("/api/adherence/today", headers=p_headers)
        slot_id = adh_res.json()[0]["id"]

        # Mark dose as missed -> triggers missed-dose email outbox tasks
        miss_res = client.post(
            f"/api/adherence/{slot_id}/check-in",
            headers=p_headers,
            json={"status": "missed", "notes": "Elder felt nauseous and skipped dose"},
        )
        assert miss_res.status_code == 200
        assert miss_res.json()["alerts_queued"] >= 2  # Patient + Caregiver

        # Verify ReminderTasks created in DB
        db = SessionLocal()
        try:
            tasks = db.query(ReminderTask).filter(
                ReminderTask.patient_id == p_id,
                ReminderTask.channel == "email",
                ReminderTask.kind == "missed_dose",
            ).all()
            assert len(tasks) >= 2
            recipients = {t.recipient_email for t in tasks}
            assert p_email in recipients
            assert cg_email in recipients

            # Claim and dispatch tasks through scheduler worker
            claimed = claim_due_tasks(db, batch_size=10)
            assert len(claimed) >= 2
            for t in claimed:
                res = asyncio.run(process_reminder_task(db, t))
                assert res["status"] == "dispatched"
                assert "message_id" in res

            # Verify in-memory email sender received both messages
            sent = email_sender.get_sent_emails()
            assert len(sent) >= 2
            sent_recipients = {s["recipient"] for s in sent}
            assert p_email in sent_recipients
            assert cg_email in sent_recipients

            # Check ReminderLog audit rows
            logs = db.query(ReminderLog).filter_by(patient_id=p_id, channel="email").all()
            assert len(logs) >= 2
        finally:
            db.close()


def test_email_templates_compilation():
    """Verify HTML email template builders produce valid content with required healthcare fields."""
    # 1. Upcoming dose email
    sub1, html1 = email_sender.build_upcoming_dose_email(
        patient_name="Ram Lal",
        medicine_brand="Dolo 650",
        dosage="650mg",
        slot="morning",
        scheduled_time="08:00 AM",
        notes="After light breakfast",
    )
    assert "Dolo 650" in sub1
    assert "08:00 AM" in sub1
    assert "Ram Lal" in html1
    assert "After light breakfast" in html1

    # 2. Missed dose email
    sub2, html2 = email_sender.build_missed_dose_email(
        patient_name="Ram Lal",
        medicine_brand="Dolo 650",
        dosage="650mg",
        slot="morning",
        scheduled_time="08:00 AM",
        recipient_role="caregiver",
    )
    assert "Care Alert" in sub2
    assert "Ram Lal" in html2
    assert "Unconfirmed / Overdue" in html2

    # 3. Doctor appointment reminder
    sub3, html3 = email_sender.build_appointment_email(
        patient_name="Ram Lal",
        doctor_name="Dr. V. K. Gupta",
        specialty="Cardiology",
        appointment_time_str="20 Nov 2026, 10:30 AM",
        location="Max Super Speciality Hospital",
    )
    assert "Dr. V. K. Gupta" in sub3
    assert "Cardiology" in html3
    assert "Max Super Speciality Hospital" in html3
    assert "Preparation Checklist" in html3
