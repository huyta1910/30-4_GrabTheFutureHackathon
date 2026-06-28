"""add driver location

Revision ID: 202606300001
Revises: 202606290001
Create Date: 2026-06-30
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606300001"
down_revision: str | None = "202606290001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("drivers", sa.Column("current_latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("drivers", sa.Column("current_longitude", sa.Numeric(9, 6), nullable=True))


def downgrade() -> None:
    op.drop_column("drivers", "current_longitude")
    op.drop_column("drivers", "current_latitude")
