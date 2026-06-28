"""add notification category

Revision ID: 202607010001
Revises: 202606300001
Create Date: 2026-07-01
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202607010001"
down_revision: str | None = "202606300001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "notifications",
        sa.Column("category", sa.String(50), nullable=False, server_default="general"),
    )


def downgrade() -> None:
    op.drop_column("notifications", "category")
