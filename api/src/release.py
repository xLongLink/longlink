import asyncio


async def schedule_migrations() -> None:
    """Schedule release migration operations after Alembic has upgraded the Platform database."""

    # Load every relationship target before the standalone process configures SQLModel mappers.
    from sqlmodel import col
    from sqlalchemy import select
    from src.database.models import users, computes, storages, databases, association, invitations, applications, organizations
    from src.models.statuses import Status
    from src.database.session import session_scope
    from src.database.services import operations as operation_service
    from src.models.operations import OperationKind
    from src.database.models.computes import ComputeRegistry
    from src.database.models.applications import Application
    from src.database.models.organizations import Organization

    # Load active Organization and Application migration targets.
    async with session_scope() as session:
        compute_rows = (await session.scalars(select(ComputeRegistry).order_by(col(ComputeRegistry.id)))).all()
        organization_rows = (
            await session.scalars(
                select(Organization)
                .where(col(Organization.deleted_at).is_(None))
                .order_by(col(Organization.compute_id), col(Organization.id))
            )
        ).all()
        application_rows = (
            await session.execute(
                select(col(Application.id), col(Organization.compute_id))
                .join(Organization, col(Organization.id) == col(Application.organization_id))
                .where(
                    col(Application.deleted_at).is_(None),
                    col(Application.status) == Status.running,
                    col(Organization.deleted_at).is_(None),
                )
                .order_by(col(Organization.compute_id), col(Application.id))
            )
        ).all()

        # Collect release targets in dependency order.
        targets = [(OperationKind.compute_create, compute.id, compute.id) for compute in compute_rows]
        targets.extend(
            (OperationKind.organization_create, organization.id, organization.compute_id) for organization in organization_rows
        )
        targets.extend(
            (OperationKind.application_create, application_id, compute_id) for application_id, compute_id in application_rows
        )
    # Create or reuse each current-release operation through its dedicated transaction.
    for kind, target_id, compute_id in targets:
        await operation_service.create(
            compute_id,
            kind=kind,
            target_id=target_id,
        )


def main() -> None:
    """Run release migration scheduling as a one-shot process."""

    # Keep the synchronous script boundary separate from the asynchronous database service.
    asyncio.run(schedule_migrations())


if __name__ == "__main__":
    main()
