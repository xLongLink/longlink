import sys
import asyncio


async def schedule_migrations() -> None:
    """Schedule release migration operations after Alembic has upgraded the Platform database."""

    # Load every relationship target before the standalone process configures SQLModel mappers.
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
        compute_rows = (await session.execute(select(ComputeRegistry).order_by(ComputeRegistry.id).with_for_update())).scalars().all()
        organization_rows = (
            (
                await session.execute(
                    select(Organization).where(Organization.deleted_at.is_(None)).order_by(Organization.compute_id, Organization.id)
                )
            )
            .scalars()
            .all()
        )
        existing = (
            await session.execute(
                select(Operation.kind, Operation.target_id).where(
                    Operation.failed.is_(False),
                    Operation.platform_version == env.VERSION,
                )
            )
        ).all()
        existing_targets = set(existing)
        lifecycle = (
            await session.execute(
                select(Operation.kind, Operation.target_id, Operation.compute_id)
                .where(
                    Operation.kind.in_(
                        [
                            OperationKind.application_create,
                            OperationKind.application_delete,
                            OperationKind.organization_create,
                            OperationKind.organization_delete,
                        ]
                    ),
                    Operation.platform_version != env.VERSION,
                    Operation.stopped_at.is_(None),
                )
                .order_by(Operation.created_at)
            )
        ).all()
        computes_by_id = {compute.id: compute for compute in compute_rows}

        # Queue one release synchronization for every outdated compute.
        for compute in compute_rows:
            if compute.version == env.VERSION or (OperationKind.compute, compute.id) in existing_targets:
                continue
            await operation_service.enqueue_in_session(
                session,
                compute.id,
                locked_compute=compute,
            )

        # Queue shared-schema and shared-folder synchronization for every active Organization.
        for organization in organization_rows:
            compute = computes_by_id[organization.compute_id]
            for kind in (OperationKind.organization_reconcile, OperationKind.storage):
                if (kind, organization.id) in existing_targets:
                    continue
                await operation_service.enqueue_in_session(
                    session,
                    organization.compute_id,
                    locked_compute=compute,
                    kind=kind,
                    target_id=organization.id,
                )

        # Carry unfinished lifecycle work forward without interrupting an older worker's lock.
        for kind, target_id, compute_id in lifecycle:
            if (kind, target_id) in existing_targets:
                continue
            await operation_service.enqueue_in_session(
                session,
                compute_id,
                locked_compute=computes_by_id[compute_id],
                kind=kind,
                target_id=target_id,
            )

        await session.commit()


def main() -> None:
    """Run release migration scheduling as a one-shot process."""

    # Keep the synchronous script boundary separate from the asynchronous database service.
    asyncio.run(schedule_migrations())


if __name__ == "__main__":
    # Setuptools executes this conventional filename with build arguments; direct execution schedules migrations.
    if len(sys.argv) > 1:
        from setuptools import setup

        setup()
    else:
        main()
