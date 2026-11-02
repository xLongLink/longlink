"""Use UUIDs as the only Organization and Solution route identities."""

import sqlalchemy as sa
from alembic import op

revision = "20261102_0014"
down_revision = "20261031_0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Remove Organization and Solution slugs without changing identities."""

    # Resolve backend-generated names and name SQLite's unnamed unique constraint.
    constraints = sa.inspect(op.get_bind()).get_unique_constraints("organizations")
    constraint = next(constraint for constraint in constraints if constraint["column_names"] == ["slug"])
    with op.batch_alter_table("organizations", naming_convention={"uq": "uq_%(table_name)s_%(column_0_name)s"}) as batch:
        batch.drop_constraint(constraint["name"] or "uq_organizations_slug", type_="unique")
        batch.drop_column("slug")

    # Remove only slug uniqueness, retaining same-Organization relationship constraints.
    constraints = sa.inspect(op.get_bind()).get_unique_constraints("solutions")
    constraint = next(constraint for constraint in constraints if constraint["column_names"] == ["organization_id", "slug"])
    with op.batch_alter_table(
        "solutions", naming_convention={"uq": "uq_%(table_name)s_%(column_0_name)s_%(column_1_name)s"}
    ) as batch:
        batch.drop_constraint(constraint["name"] or "uq_solutions_organization_id_slug", type_="unique")
        batch.drop_column("slug")


def downgrade() -> None:
    """Restore slugs from UUIDs without requiring unique display names."""

    # Recreate routing identities without attempting to recover discarded historical slugs.
    with op.batch_alter_table("organizations") as batch:
        batch.add_column(sa.Column("slug", sa.String(128), nullable=True))
    organizations = sa.table("organizations", sa.column("id", sa.Uuid()), sa.column("slug", sa.String(128)))
    op.execute(organizations.update().values(slug=sa.cast(organizations.c.id, sa.String(128))))
    with op.batch_alter_table("organizations") as batch:
        batch.alter_column("slug", existing_type=sa.String(128), nullable=False)
        batch.create_unique_constraint("uq_organizations_slug", ["slug"])

    # Restore Solution routing without changing Organization ownership or release references.
    with op.batch_alter_table("solutions") as batch:
        batch.add_column(sa.Column("slug", sa.String(100), nullable=True))
    solutions = sa.table("solutions", sa.column("id", sa.Uuid()), sa.column("slug", sa.String(100)))
    op.execute(solutions.update().values(slug=sa.cast(solutions.c.id, sa.String(100))))
    with op.batch_alter_table("solutions") as batch:
        batch.alter_column("slug", existing_type=sa.String(100), nullable=False)
        batch.create_unique_constraint("uq_solutions_organization_id_slug", ["organization_id", "slug"])
