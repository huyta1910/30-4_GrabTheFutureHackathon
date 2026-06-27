"""add driver_id to ride_pool_groups

Revision ID: 202606290001
Revises: 202606280001
Create Date: 2026-06-29
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "202606290001"
down_revision: str | None = "202606280001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "ride_pool_groups",
        sa.Column("driver_id", postgresql.UUID(as_uuid=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_ride_pool_groups_driver_id_drivers",
        "ride_pool_groups",
        "drivers",
        ["driver_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_ride_pool_groups_driver_id_drivers",
        "ride_pool_groups",
        type_="foreignkey",
    )
    op.drop_column("ride_pool_groups", "driver_id")
