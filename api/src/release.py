import asyncio


async def schedule_migrations() -> None:
    """Schedule release migration operations after Alembic has upgraded the Platform database."""

    # Load every relationship target before the standalone process configures SQLModel mappers.
    from sqlmodel import col
    from sqlalchemy import select
    from src.environments import env
    from src.database.models import users, computes, storages, databases, association, invitations, applications, organizations
    from src.database.session import session_scope
    from src.database.services import operations as operation_service
    from src.models.operations import OperationKind
    from src.database.models.computes import ComputeRegistry
    from src.database.models.operations import Operation
    from src.database.models.organizations import Organization

    # Lock compute aggregates and load active Organization migration targets.
    async with session_scope() as session:
        compute_rows = (await session.execute(select(ComputeRegistry).order_by(col(ComputeRegistry.id)).with_for_update())).scalars().all()
        organization_rows = (
            (
                await session.execute(
                    select(Organization)
                    .where(col(Organization.deleted_at).is_(None))
                    .order_by(col(Organization.compute_id), col(Organization.id))
                )
            )
            .scalars()
            .all()
        )
        existing_targets = set(
            (
                await session.execute(
                    select(col(Operation.kind), col(Operation.target_id)).where(
                        col(Operation.kind).in_([OperationKind.compute_reconcile, OperationKind.organization_reconcile]),
                        col(Operation.failed).is_(False),
                        col(Operation.platform_version) == env.VERSION,
                    )
                )
            ).all()
        )
        computes_by_id = {compute.id: compute for compute in compute_rows}

        # Queue one release reconciliation for every compute.
        for compute in compute_rows:
            if (OperationKind.compute_reconcile, compute.id) in existing_targets:
                continue
            await operation_service.enqueue_in_session(
                session,
                compute.id,
                locked_compute=compute,
            )

        # Queue one release reconciliation for every active Organization.
        for organization in organization_rows:
            if (OperationKind.organization_reconcile, organization.id) in existing_targets:
                continue
            compute = computes_by_id[organization.compute_id]
            await operation_service.enqueue_in_session(
                session,
                organization.compute_id,
                locked_compute=compute,
                kind=OperationKind.organization_reconcile,
                target_id=organization.id,
            )

        await session.commit()


def main() -> None:
    """Run release migration scheduling as a one-shot process."""

    # Keep the synchronous script boundary separate from the asynchronous database service.
    asyncio.run(schedule_migrations())


if __name__ == "__main__":
    main()
