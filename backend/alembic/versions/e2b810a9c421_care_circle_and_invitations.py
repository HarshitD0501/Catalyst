"""care_circle_and_invitations

Revision ID: e2b810a9c421
Revises: 8d716ab6add5
Create Date: 2026-11-15 12:20:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'e2b810a9c421'
down_revision: Union[str, None] = '8d716ab6add5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. Extend caregiver_links if columns not present
    if 'caregiver_links' in existing_tables:
        existing_cols = {c['name'] for c in insp.get_columns('caregiver_links')}
        if 'role' not in existing_cols:
            op.add_column('caregiver_links', sa.Column('role', sa.String(), server_default='CARE_MANAGER', nullable=True))
        if 'permissions' not in existing_cols:
            op.add_column('caregiver_links', sa.Column('permissions', sa.String(), server_default='["read", "write_meds", "write_adherence", "write_appointments"]', nullable=True))
        if 'status' not in existing_cols:
            op.add_column('caregiver_links', sa.Column('status', sa.String(), server_default='ACTIVE', nullable=True))
        if 'revoked_at' not in existing_cols:
            op.add_column('caregiver_links', sa.Column('revoked_at', sa.DateTime(), nullable=True))

    # 2. invitations table
    if 'invitations' not in existing_tables:
        op.create_table(
            'invitations',
            sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column('patient_id', sa.String(), sa.ForeignKey('patients.id'), nullable=False),
            sa.Column('recipient_email', sa.String(), nullable=False),
            sa.Column('relation', sa.String(), server_default='Family'),
            sa.Column('role', sa.String(), server_default='CARE_MANAGER'),
            sa.Column('permissions', sa.String(), server_default='["read", "write_meds", "write_adherence", "write_appointments"]'),
            sa.Column('passcode_hash', sa.String(64), nullable=False),
            sa.Column('passcode_salt', sa.String(32), nullable=False),
            sa.Column('expires_at', sa.DateTime(), nullable=False),
            sa.Column('attempt_count', sa.Integer(), server_default='0'),
            sa.Column('max_attempts', sa.Integer(), server_default='5'),
            sa.Column('status', sa.String(), server_default='PENDING'),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('redeemed_at', sa.DateTime(), nullable=True),
            sa.Column('redeemed_by_id', sa.String(), sa.ForeignKey('patients.id'), nullable=True),
        )
        op.create_index('ix_invitations_patient_id', 'invitations', ['patient_id'])
        op.create_index('ix_invitations_recipient_email', 'invitations', ['recipient_email'])


def downgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    if 'invitations' in existing_tables:
        op.drop_table('invitations')

