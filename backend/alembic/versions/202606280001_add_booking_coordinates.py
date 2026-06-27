"""add booking coordinates

Revision ID: 202606280001
Revises: 202606270001
Create Date: 2026-06-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "202606280001"
down_revision: str | None = "202606270001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("bookings", sa.Column("pickup_latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("bookings", sa.Column("pickup_longitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("bookings", sa.Column("dropoff_latitude", sa.Numeric(9, 6), nullable=True))
    op.add_column("bookings", sa.Column("dropoff_longitude", sa.Numeric(9, 6), nullable=True))


def downgrade() -> None:
    op.drop_column("bookings", "dropoff_longitude")
    op.drop_column("bookings", "dropoff_latitude")
    op.drop_column("bookings", "pickup_longitude")
    op.drop_column("bookings", "pickup_latitude")
