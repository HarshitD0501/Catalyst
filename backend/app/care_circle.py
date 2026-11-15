"""
Care Circle Management Service & API Router.
Implements:
- REQ-02: Secure, passcode-based access for family members and caretakers.
- REQ-03: Permission-controlled access (Care Manager vs Family Viewer) & instant revocation.
Zero-Trust Security:
- CSPRNG 8-digit decimal passcodes.
- HMAC-SHA256 hashed at rest with per-invitation salt and server pepper.
- 10-minute expiry window.
- Maximum 5 attempts with atomic lockout.
- Immediate revocation enforcement.
"""
from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from .auth import resolve_actor, check_permission
from .config import settings
from .db import get_db
from .models import Patient, CaregiverLink, Invitation, _now

router = APIRouter()


# -----------------------------------------------------------------------------
# Cryptographic Passcode Helpers
# -----------------------------------------------------------------------------

def _generate_passcode() -> tuple[str, str, str]:
    """Generate high-entropy 8-digit passcode, 16-byte salt, and HMAC-SHA256 hash."""
    passcode = "".join(secrets.choice(string.digits) for _ in range(8))
    salt = secrets.token_hex(16)
    pepper = settings.secret_key.encode("utf-8")
    passcode_hash = hmac.new(
        pepper,
        (passcode + salt).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return passcode, salt, passcode_hash


def _verify_passcode(passcode: str, salt: str, expected_hash: str) -> bool:
    """Verify submitted passcode against salt and expected HMAC-SHA256 hash."""
    pepper = settings.secret_key.encode("utf-8")
    computed_hash = hmac.new(
        pepper,
        (passcode.strip() + salt).encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return secrets.compare_digest(computed_hash, expected_hash)


# -----------------------------------------------------------------------------
# Schemas
# -----------------------------------------------------------------------------

class CreateInvitationRequest(BaseModel):
    recipient_email: str = Field(..., description="Email address of the family member or caregiver")
    relation: str = Field("Family", description="Relationship: e.g. Daughter, Son, Spouse, Nurse")
    role: str = Field("CARE_MANAGER", description="'CARE_MANAGER' (read/write) or 'VIEWER' (read-only)")
    permissions: Optional[List[str]] = Field(
        None,
        description="Explicit permission list. If omitted, defaults based on role.",
    )


class RedeemInvitationRequest(BaseModel):
    recipient_email: str = Field(..., description="Email address invitation was sent to")
    passcode: str = Field(..., min_length=8, max_length=8, description="8-digit single-use passcode")


# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------

@router.post("/invitations", status_code=status.HTTP_201_CREATED)
def create_invitation(
    req: CreateInvitationRequest,
    db: Session = Depends(get_db),
    actor_patient: tuple[Patient, Patient | None] = Depends(resolve_actor),
):
    """
    Patient-initiated invitation generation.
    Only the patient owner may invite family members into their Care Circle.
    Generates a secure 8-digit single-use passcode valid for 10 minutes.
    """
    actor, patient = actor_patient
    if not patient or actor.id != patient.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient profile owner can invite Care Circle members.",
        )

    # Normalize role and default permissions
    role = req.role.upper().strip()
    if role not in ("CARE_MANAGER", "VIEWER"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'CARE_MANAGER' or 'VIEWER'.",
        )

    if req.permissions is not None:
        perms = req.permissions
    elif role == "CARE_MANAGER":
        perms = ["read", "write_meds", "write_adherence", "write_appointments"]
    else:  # VIEWER
        perms = ["read"]

    # Generate cryptographic credentials
    passcode, salt, passcode_hash = _generate_passcode()
    expires_at = _now() + timedelta(minutes=10)

    # Check for existing pending invitation for same email; revoke old ones
    existing = (
        db.query(Invitation)
        .filter(
            Invitation.patient_id == patient.id,
            Invitation.recipient_email == req.recipient_email.lower().strip(),
            Invitation.status == "PENDING",
        )
        .all()
    )
    for old_inv in existing:
        old_inv.status = "REVOKED"

    invitation = Invitation(
        patient_id=patient.id,
        recipient_email=req.recipient_email.lower().strip(),
        relation=req.relation.strip(),
        role=role,
        permissions=json.dumps(perms),
        passcode_hash=passcode_hash,
        passcode_salt=salt,
        expires_at=expires_at,
        attempt_count=0,
        max_attempts=5,
        status="PENDING",
        created_at=_now(),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    return {
        "success": True,
        "invitation_id": invitation.id,
        "patient_name": patient.name or "Patient",
        "recipient_email": invitation.recipient_email,
        "relation": invitation.relation,
        "role": invitation.role,
        "permissions": perms,
        "passcode": passcode,  # Plaintext returned ONLY on creation for immediate sharing/email
        "expires_at": invitation.expires_at.isoformat(),
        "message": f"Invitation created. Share the 8-digit passcode ({passcode}) with {invitation.recipient_email}.",
    }


@router.post("/redeem")
def redeem_invitation(
    req: RedeemInvitationRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db),
):
    """
    Caregiver redemption of an 8-digit passcode.
    Verifies single-use, 10-minute expiry, and brute-force attempt limits.
    On success: grants access and establishes an active CaregiverLink.
    """
    # Verify logged in caregiver account
    from .auth import _verify_token
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication required to redeem invitation.")
    caregiver_id = _verify_token(authorization.split(" ", 1)[1])
    caregiver = db.get(Patient, caregiver_id)
    if not caregiver:
        raise HTTPException(status_code=401, detail="Account not found.")

    email_clean = req.recipient_email.lower().strip()
    passcode_clean = req.passcode.strip()

    invitation = (
        db.query(Invitation)
        .filter(
            Invitation.recipient_email == email_clean,
            Invitation.status.in_(["PENDING", "LOCKED", "EXPIRED"]),
        )
        .order_by(Invitation.id.desc())
        .first()
    )

    if not invitation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active invitation found for this email address.",
        )

    # 1. Check if locked
    if invitation.status == "LOCKED" or invitation.attempt_count >= invitation.max_attempts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum passcode verification attempts exceeded. Invitation has been locked.",
        )

    # 2. Check expiration
    now_ts = _now()
    exp = invitation.expires_at
    if exp.tzinfo is not None and now_ts.tzinfo is None:
        now_ts = now_ts.replace(tzinfo=timezone.utc)
    elif exp.tzinfo is None and now_ts.tzinfo is not None:
        now_ts = now_ts.replace(tzinfo=None)

    if invitation.status == "EXPIRED" or exp < now_ts:
        invitation.status = "EXPIRED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This invitation passcode has expired. Please request a new invitation.",
        )

    # 3. Verify cryptographic passcode
    is_valid = _verify_passcode(passcode_clean, invitation.passcode_salt, invitation.passcode_hash)
    if not is_valid:
        invitation.attempt_count += 1
        remaining = invitation.max_attempts - invitation.attempt_count
        if remaining <= 0:
            invitation.status = "LOCKED"
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid passcode. {remaining} attempt(s) remaining.",
        )

    # 4. Successful redemption -> Atomic transition
    invitation.status = "REDEEMED"
    invitation.redeemed_at = _now()
    invitation.redeemed_by_id = caregiver.id

    # Create or Reactivate CaregiverLink
    link = (
        db.query(CaregiverLink)
        .filter(
            CaregiverLink.caregiver_id == caregiver.id,
            CaregiverLink.patient_id == invitation.patient_id,
        )
        .first()
    )

    if link:
        link.status = "ACTIVE"
        link.revoked_at = None
        link.relation = invitation.relation
        link.role = invitation.role
        link.permissions = invitation.permissions
        link.consented_at = _now()
    else:
        link = CaregiverLink(
            caregiver_id=caregiver.id,
            patient_id=invitation.patient_id,
            relation=invitation.relation,
            role=invitation.role,
            permissions=invitation.permissions,
            status="ACTIVE",
            consented_at=_now(),
            created_at=_now(),
        )
        db.add(link)

    # Ensure caregiver role is set on account
    if (caregiver.role or "patient") != "caregiver":
        caregiver.role = "caregiver"

    db.commit()

    patient = db.get(Patient, invitation.patient_id)
    perms_list = json.loads(invitation.permissions or "[]")

    return {
        "success": True,
        "message": f"Successfully joined Care Circle for {patient.name or 'Patient'}!",
        "patient_id": patient.id,
        "patient_name": patient.name or "Patient",
        "role": invitation.role,
        "permissions": perms_list,
    }


@router.get("/members")
def get_care_circle_members(
    db: Session = Depends(get_db),
    actor_patient: tuple[Patient, Patient | None] = Depends(resolve_actor),
):
    """
    Get all active members of the patient's Care Circle and pending invitations.
    Visible to the patient and authorized Care Circle members.
    """
    actor, patient = actor_patient
    if not patient:
        raise HTTPException(status_code=403, detail="No active patient context.")

    # 1. Active linked caregivers
    links = (
        db.query(CaregiverLink)
        .filter(
            CaregiverLink.patient_id == patient.id,
            CaregiverLink.status == "ACTIVE",
            CaregiverLink.revoked_at.is_(None),
        )
        .all()
    )

    members = []
    for link in links:
        cg = db.get(Patient, link.caregiver_id)
        if cg:
            try:
                perms = json.loads(link.permissions or "[]")
            except Exception:
                perms = []
            members.append({
                "link_id": link.id,
                "caregiver_id": cg.id,
                "name": cg.name or "Family Member",
                "email": cg.email,
                "phone": cg.phone,
                "relation": link.relation or "Family",
                "role": link.role or "CARE_MANAGER",
                "permissions": perms,
                "consented_at": link.consented_at.isoformat() if link.consented_at else None,
            })

    # 2. Pending invitations (only patient owner sees these)
    pending = []
    if actor.id == patient.id:
        invs = (
            db.query(Invitation)
            .filter(
                Invitation.patient_id == patient.id,
                Invitation.status == "PENDING",
            )
            .order_by(Invitation.id.desc())
            .all()
        )
        for inv in invs:
            try:
                perms = json.loads(inv.permissions or "[]")
            except Exception:
                perms = []
            pending.append({
                "id": inv.id,
                "recipient_email": inv.recipient_email,
                "relation": inv.relation,
                "role": inv.role,
                "permissions": perms,
                "expires_at": inv.expires_at.isoformat(),
                "created_at": inv.created_at.isoformat(),
            })

    return {
        "patient_id": patient.id,
        "patient_name": patient.name,
        "is_owner": actor.id == patient.id,
        "members": members,
        "pending_invitations": pending,
    }


@router.post("/members/{link_id}/revoke")
def revoke_member(
    link_id: int,
    db: Session = Depends(get_db),
    actor_patient: tuple[Patient, Patient | None] = Depends(resolve_actor),
):
    """
    Patient-initiated revocation of caregiver access.
    Instantly disables all permissions for the specified caregiver link.
    """
    actor, patient = actor_patient
    if not patient or actor.id != patient.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient profile owner can revoke Care Circle access.",
        )

    link = (
        db.query(CaregiverLink)
        .filter(
            CaregiverLink.id == link_id,
            CaregiverLink.patient_id == patient.id,
        )
        .first()
    )

    if not link:
        raise HTTPException(status_code=404, detail="Care Circle member link not found.")

    link.status = "REVOKED"
    link.revoked_at = _now()
    db.commit()

    return {
        "success": True,
        "link_id": link_id,
        "status": "REVOKED",
        "message": "Care Circle member access has been revoked immediately.",
    }


@router.delete("/invitations/{invitation_id}")
def cancel_invitation(
    invitation_id: int,
    db: Session = Depends(get_db),
    actor_patient: tuple[Patient, Patient | None] = Depends(resolve_actor),
):
    """Cancel a pending Care Circle invitation."""
    actor, patient = actor_patient
    if not patient or actor.id != patient.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the patient profile owner can cancel invitations.",
        )

    inv = (
        db.query(Invitation)
        .filter(
            Invitation.id == invitation_id,
            Invitation.patient_id == patient.id,
        )
        .first()
    )
    if not inv:
        raise HTTPException(status_code=404, detail="Invitation not found.")

    inv.status = "REVOKED"
    db.commit()

    return {"success": True, "message": "Invitation cancelled successfully."}

