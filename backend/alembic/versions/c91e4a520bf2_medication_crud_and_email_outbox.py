"""medication_crud_and_email_outbox

Revision ID: c91e4a520bf2
Revises: e2b810a9c421
Create Date: 2026-11-15 13:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c91e4a520bf2'
down_revision: Union[str, None] = 'e2b810a9c421'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    insp = sa.inspect(conn)
    existing_tables = set(insp.get_table_names())

    # 1. Extend patients with email reminder settings
    if 'patients' in existing_tables:
        patient_cols = {c['name'] for c in insp.get_columns('patients')}
        if 'email_reminders_enabled' not in patient_cols:
            op.add_column('patients', sa.Column('email_reminders_enabled', sa.Boolean(), server_default=sa.text('1'), nullable=True))
        if 'email_consent_source' not in patient_cols:
            op.add_column('patients', sa.Column('email_consent_source', sa.String(), server_default='signup', nullable=True))
        if 'email_consent_withdrawn_at' not in patient_cols:
            op.add_column('patients', sa.Column('email_consent_withdrawn_at', sa.DateTime(), nullable=True))

    # 2. Extend reminder_tasks with recipient_email and provider_message_id
    if 'reminder_tasks' in existing_tables:
        reminder_cols = {c['name'] for c in insp.get_columns('reminder_tasks')}
        if 'recipient_email' not in reminder_cols:
            op.add_column('reminder_tasks', sa.Column('recipient_email', sa.String(), nullable=True))
        if 'provider_message_id' not in reminder_cols:
            op.add_column('reminder_tasks', sa.Column('provider_message_id', sa.String(), nullable=True))

    # 3. Extend dose_adherences with logged_by_user_id and actor_role
    if 'dose_adherences' in existing_tables:
        adherence_cols = {c['name'] for c in insp.get_columns('dose_adherences')}
        if 'logged_by_user_id' not in adherence_cols:
            op.add_column('dose_adherences', sa.Column('logged_by_user_id', sa.String(), nullable=True))
        if 'actor_role' not in adherence_cols:
            op.add_column('dose_adherences', sa.Column('actor_role', sa.String(), nullable=True))


def downgrade() -> None:
    pass

