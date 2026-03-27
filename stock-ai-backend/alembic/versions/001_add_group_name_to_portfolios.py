"""add group_name to portfolios

Revision ID: 001
Revises:
Create Date: 2026-03-27
"""

from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "portfolios",
        sa.Column("group_name", sa.String(100), nullable=True, server_default="기본"),
    )
    # 기존 데이터 기본값 채우기
    op.execute("UPDATE portfolios SET group_name = '기본' WHERE group_name IS NULL")


def downgrade() -> None:
    op.drop_column("portfolios", "group_name")
