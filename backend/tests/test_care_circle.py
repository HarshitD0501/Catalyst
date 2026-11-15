"""
Unit and Integration Test Suite for Care Circle & Passcode Invitation Engine (Phase 2).
Verifies:
- REQ-02: Secure, passcode-based access for family members and caretakers.
- REQ-03: Permission-controlled access (Care Manager vs Family Viewer) & instant revocation.
- Zero-Trust Security: Cryptographic hashing, single-use, 10-minute expiry, brute-force lockout.
"""
from __future__ import annotations

import os
import sys
import json
import tempfile
from pathlib import Path
from datetime import datetime, timezone, timedelta

backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

os.environ.setdefault("DATABASE_URL", "")
os.environ["ENVIRONMENT"] = "test"
os.environ["ENABLE_DEMO_ACCOUNTS"] = "true"

# Isolated sqlite database per test run
_fd, _path = tempfile.mkstemp(suffix=".db")
os.environ["DATABASE_URL"] = f"sqlite:///{_path.replace(os.sep, '/')}"

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.db import get_db, init_db, SessionLocal
from app.models import Patient, CaregiverLink, Invitation, _now
from app.auth import hash_password, make_token, check_permission


def setup_module():
    """Ensure clean migration state before tests."""
    init_db()


def test_care_circle_full_lifecycle():
    client = TestClient(app)
    db: Session = SessionLocal()

    # 1. Setup Patient and Caregiver test accounts
    patient = db.get(Patient, "test-patient-elderly")
    if not patient:
        patient = Patient(
            id="test-patient-elderly",
            name="Ramesh Patel",
            email="ramesh.test@example.com",
            phone="+919876543210",
            password_hash=hash_password("PatientSecret123"),
            role="patient",
        )
        db.add(patient)

    caregiver = db.get(Patient, "test-caregiver-daughter")
    if not caregiver:
        caregiver = Patient(
            id="test-caregiver-daughter",
            name="Anita Patel",
            email="anita.daughter@example.com",
            phone="+919876543211",
            password_hash=hash_password("CaregiverSecret123"),
            role="caregiver",
        )
        db.add(caregiver)
    db.commit()

    patient_token = make_token(patient.id)
    caregiver_token = make_token(caregiver.id)

    headers_patient = {"Authorization": f"Bearer {patient_token}"}
    headers_caregiver = {"Authorization": f"Bearer {caregiver_token}"}

    # 2. Patient creates Care Circle invitation with CARE_MANAGER role
    res_inv = client.post(
        "/api/care-circle/invitations",
        headers=headers_patient,
        json={
            "recipient_email": "anita.daughter@example.com",
            "relation": "Daughter",
            "role": "CARE_MANAGER",
        },
    )
    assert res_inv.status_code == 201, f"Create invitation failed: {res_inv.text}"
    inv_data = res_inv.json()
    assert inv_data["success"] is True
    assert len(inv_data["passcode"]) == 8
    assert inv_data["passcode"].isdigit()
    assert inv_data["role"] == "CARE_MANAGER"
    assert "write_meds" in inv_data["permissions"]

    passcode = inv_data["passcode"]
    inv_id = inv_data["invitation_id"]

    # Verify DB state: Plaintext passcode must NOT be in DB
    inv_db = db.get(Invitation, inv_id)
    assert inv_db is not None
    assert inv_db.passcode_hash != passcode
    assert len(inv_db.passcode_hash) == 64
    assert inv_db.status == "PENDING"

    # 3. Caregiver redeems passcode successfully
    res_redeem = client.post(
        "/api/care-circle/redeem",
        headers=headers_caregiver,
        json={
            "recipient_email": "anita.daughter@example.com",
            "passcode": passcode,
        },
    )
    assert res_redeem.status_code == 200, f"Redeem failed: {res_redeem.text}"
    redeem_data = res_redeem.json()
    assert redeem_data["success"] is True
    assert redeem_data["patient_id"] == "test-patient-elderly"
    assert redeem_data["role"] == "CARE_MANAGER"

    # Verify CaregiverLink is active in DB
    link = (
        db.query(CaregiverLink)
        .filter(
            CaregiverLink.caregiver_id == caregiver.id,
            CaregiverLink.patient_id == patient.id,
        )
        .first()
    )
    assert link is not None
    assert link.status == "ACTIVE"
    assert link.role == "CARE_MANAGER"
    assert link.revoked_at is None
    assert check_permission(caregiver, patient, "write_meds", db) is True

    # 4. Replay attack rejection: Cannot redeem the same invitation twice
    res_replay = client.post(
        "/api/care-circle/redeem",
        headers=headers_caregiver,
        json={
            "recipient_email": "anita.daughter@example.com",
            "passcode": passcode,
        },
    )
    assert res_replay.status_code == 404  # No active PENDING invitation remains

    # 5. Verify Roster: Patient views Care Circle members
    res_roster = client.get("/api/care-circle/members", headers=headers_patient)
    assert res_roster.status_code == 200
    roster = res_roster.json()
    assert len(roster["members"]) >= 1
    member = next(m for m in roster["members"] if m["caregiver_id"] == caregiver.id)
    assert member["relation"] == "Daughter"
    assert member["role"] == "CARE_MANAGER"

    # 6. Patient revokes Caregiver access
    res_revoke = client.post(
        f"/api/care-circle/members/{link.id}/revoke",
        headers=headers_patient,
    )
    assert res_revoke.status_code == 200
    db.refresh(link)
    assert link.status == "REVOKED"
    assert link.revoked_at is not None

    # Verify that revoked caregiver can no longer act on patient
    assert check_permission(caregiver, patient, "write_meds", db) is False

    db.close()


def test_care_circle_passcode_expiration_and_brute_force():
    client = TestClient(app)
    db: Session = SessionLocal()

    patient = db.get(Patient, "test-patient-elderly")
    caregiver = db.get(Patient, "test-caregiver-daughter")
    patient_token = make_token(patient.id)
    caregiver_token = make_token(caregiver.id)

    headers_patient = {"Authorization": f"Bearer {patient_token}"}
    headers_caregiver = {"Authorization": f"Bearer {caregiver_token}"}

    # Test Expiration
    res_inv = client.post(
        "/api/care-circle/invitations",
        headers=headers_patient,
        json={
            "recipient_email": "expired.test@example.com",
            "relation": "Son",
            "role": "VIEWER",
        },
    )
    assert res_inv.status_code == 201
    passcode = res_inv.json()["passcode"]
    inv_id = res_inv.json()["invitation_id"]

    # Fast-forward expiry to 15 minutes ago
    inv = db.get(Invitation, inv_id)
    inv.expires_at = _now() - timedelta(minutes=15)
    db.commit()

    res_exp = client.post(
        "/api/care-circle/redeem",
        headers=headers_caregiver,
        json={
            "recipient_email": "expired.test@example.com",
            "passcode": passcode,
        },
    )
    assert res_exp.status_code == 400
    assert "expired" in res_exp.text.lower()

    # Test Brute-Force Lockout (5 wrong attempts)
    res_inv2 = client.post(
        "/api/care-circle/invitations",
        headers=headers_patient,
        json={
            "recipient_email": "brute.force@example.com",
            "relation": "Nurse",
            "role": "CARE_MANAGER",
        },
    )
    assert res_inv2.status_code == 201

    for attempt in range(1, 5):
        res_fail = client.post(
            "/api/care-circle/redeem",
            headers=headers_caregiver,
            json={
                "recipient_email": "brute.force@example.com",
                "passcode": "00000000",
            },
        )
        assert res_fail.status_code == 401
        assert f"{5 - attempt} attempt(s) remaining" in res_fail.text

    # 5th wrong attempt locks the code
    res_lock = client.post(
        "/api/care-circle/redeem",
        headers=headers_caregiver,
        json={
            "recipient_email": "brute.force@example.com",
            "passcode": "00000000",
        },
    )
    assert res_lock.status_code == 401
    assert "0 attempt(s) remaining" in res_lock.text

    # 6th attempt is rejected as LOCKED
    res_locked = client.post(
        "/api/care-circle/redeem",
        headers=headers_caregiver,
        json={
            "recipient_email": "brute.force@example.com",
            "passcode": "00000000",
        },
    )
    assert res_locked.status_code == 400
    assert "locked" in res_locked.text.lower()

    db.close()


def test_caregiver_viewer_role_is_strictly_read_only():
    client = TestClient(app)
    db: Session = SessionLocal()

    patient = db.get(Patient, "test-patient-elderly")
    viewer = db.get(Patient, "test-viewer-friend")
    if not viewer:
        viewer = Patient(
            id="test-viewer-friend",
            name="Suresh Friend",
            email="suresh.friend@example.com",
            phone="+919876543212",
            password_hash=hash_password("FriendSecret123"),
            role="caregiver",
        )
        db.add(viewer)
        db.commit()

    patient_token = make_token(patient.id)
    viewer_token = make_token(viewer.id)

    # Patient invites as VIEWER (read-only)
    res_inv = client.post(
        "/api/care-circle/invitations",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "recipient_email": "suresh.friend@example.com",
            "relation": "Friend",
            "role": "VIEWER",
        },
    )
    passcode = res_inv.json()["passcode"]

    # Redeem
    res_redeem = client.post(
        "/api/care-circle/redeem",
        headers={"Authorization": f"Bearer {viewer_token}"},
        json={
            "recipient_email": "suresh.friend@example.com",
            "passcode": passcode,
        },
    )
    assert res_redeem.status_code == 200
    assert res_redeem.json()["role"] == "VIEWER"

    # Verify Viewer permissions: read allowed, writes denied
    assert check_permission(viewer, patient, "read", db) is True
    assert check_permission(viewer, patient, "write_meds", db) is False
    assert check_permission(viewer, patient, "write_adherence", db) is False
    assert check_permission(viewer, patient, "write_appointments", db) is False

    db.close()
