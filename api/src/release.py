import asyncio


async def schedule_migrations() -> None:
    """Schedule release migration operations after Alembic has upgraded the Platform database."""

    # Load every relationship target before the standalone process configures SQLModel mappers.
    from sqlmodel import col
    from sqlalchemy import select
    from src.environments import env
    from src.database.models import users, computes, storages, databases, association, invitations, applications, organizations
    from src.models.statuses import Status
    from src.database.session import session_scope
    from src.database.services import operations as operation_service
    from src.models.operations import OperationKind
    from src.database.models.computes import ComputeRegistry
    from src.database.models.operations import Operation
    from src.database.models.applications import Application
    from src.database.models.organizations import Organization

    # Lock compute aggregates and load active Organization and Application migration targets.
    async with session_scope() as session:
        compute_rows = (await session.scalars(select(ComputeRegistry).order_by(col(ComputeRegistry.id)).with_for_update())).all()
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

        # Collect release targets in dependency order before filtering already scheduled work.
        targets = [(OperationKind.compute_reconcile, compute.id, compute.id) for compute in compute_rows]
        targets.extend(
            (OperationKind.organization_create, organization.id, organization.compute_id) for organization in organization_rows
        )
        targets.extend(
            (OperationKind.application_create, application_id, compute_id) for application_id, compute_id in application_rows
        )
        existing_targets = set(
            (
                await session.execute(
                    select(col(Operation.kind), col(Operation.target_id)).where(
                        col(Operation.kind).in_({kind for kind, _, _ in targets}),
                        col(Operation.failed).is_(False),
                        col(Operation.platform_version) == env.VERSION,
                    )
                )
            ).all()
        )
        computes_by_id = {compute.id: compute for compute in compute_rows}

        # Queue every target that does not already have current release work.
        for kind, target_id, compute_id in targets:
            if (kind, target_id) in existing_targets:
                continue
            compute = computes_by_id[compute_id]
            await operation_service.enqueue_in_session(
                session,
                compute_id,
                locked_compute=compute,
                kind=kind,
                target_id=target_id,
            )

        await session.commit()


def main() -> None:
    """Run release migration scheduling as a one-shot process."""

    # Keep the synchronous script boundary separate from the asynchronous database service.
    asyncio.run(schedule_migrations())


if __name__ == "__main__":
    main()
