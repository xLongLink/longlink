import asyncio


async def schedule_reconciliation() -> None:
    """Schedule deployment reconciliation for every current resource desired state."""

    # Load every relationship target before the standalone process configures SQLModel mappers.
    from sqlmodel import col
    from sqlalchemy import select
    from src.errors import NotFoundError
    from src.database.models import users, computes, storages, databases, association, invitations, applications, organizations
    from src.database.session import session_scope
    from src.database.services import operations as operation_service
    from src.models.operations import OperationKind
    from src.database.models.computes import ComputeRegistry
    from src.database.models.applications import Application
    from src.database.models.organizations import Organization

    # Discover deployment reconciliation targets in dependency order.
    async with session_scope() as session:
        compute_rows = (await session.scalars(select(ComputeRegistry).order_by(col(ComputeRegistry.id)))).all()
        organization_rows = (await session.scalars(select(Organization).order_by(col(Organization.compute_id), col(Organization.id)))).all()
        application_rows = (
            await session.execute(
                select(col(Application.id), col(Application.deleted_at), col(Organization.compute_id))
                .join(Organization, col(Organization.id) == col(Application.organization_id))
                .where(col(Organization.deleted_at).is_(None))
                .order_by(col(Organization.compute_id), col(Application.id))
            )
        ).all()

        # Reconcile every present resource and clean up every tombstone.
        targets = [(OperationKind.compute_create, compute.id, compute.id) for compute in compute_rows]
        targets.extend(
            (
                OperationKind.organization_delete if organization.deleted_at is not None else OperationKind.organization_create,
                organization.id,
                organization.compute_id,
            )
            for organization in organization_rows
        )
        targets.extend(
            (OperationKind.application_delete if deleted_at is not None else OperationKind.application_create, application_id, compute_id)
            for application_id, deleted_at, compute_id in application_rows
        )
    # Create or reuse each desired-state operation through its own transaction.
    for kind, target_id, compute_id in targets:
        async with session_scope() as session:
            # Skip targets whose Compute was deleted after release discovery.
            try:
                await operation_service.enqueue(
                    session,
                    compute_id,
                    kind=kind,
                    target_id=target_id,
                )
            except NotFoundError:
                continue
            await session.commit()


def main() -> None:
    """Run deployment reconciliation scheduling as a one-shot process."""

    # Keep the synchronous script boundary separate from the asynchronous database service.
    asyncio.run(schedule_reconciliation())


if __name__ == "__main__":
    main()
