from uuid import UUID, uuid4
from sqlalchemy import select
from collections.abc import Sequence
from src.models.types import Image
from src.models.metadata import LongLinkMetadata
from src.models.statuses import Status
from src.database.session import session_scope
from src.database.services import solutions, operations, organizations
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.computes import ComputeRegistry
from src.database.models.solutions import Solution
from src.database.models.operations import Operation
from src.database.models.organizations import Organization


async def queue_operation(*, kind: OperationKind = OperationKind.compute_create, target_id: UUID) -> Operation:
    """Queue one standalone Operation through an explicit test transaction."""

    # Tests without a resource command transaction commit their queued work here.
    async with session_scope() as session:
        operation = await operations.enqueue(session, kind=kind, target_id=target_id)
        await session.commit()
        return operation


async def claim_operation() -> Operation | None:
    """Claim one queued Operation in a committed test transaction."""

    async with session_scope() as session:
        operation = await operations.claim(session)
        await session.commit()
        return operation


async def complete_operation(operation_id: UUID) -> Operation | None:
    """Complete one queued Operation in a committed test transaction."""

    async with session_scope() as session:
        operation = await operations.complete(session, operation_id)
        await session.commit()
        return operation


async def fail_operation(operation_id: UUID, reason: str = "Operation failed") -> Operation | None:
    """Fail one queued Operation in a committed test transaction."""

    async with session_scope() as session:
        operation = await operations.fail(session, operation_id, reason)
        await session.commit()
        return operation


async def fetch_operations() -> Sequence[Operation]:
    """Fetch queued Operations through an explicit test session."""

    async with session_scope() as session:
        result = await session.scalars(select(Operation).order_by(Operation.created_at.desc()))
        return result.all()


async def create_compute() -> ComputeRegistry:
    """Create one minimal Compute registry without queueing reconciliation."""

    # Operation tests need a persisted Compute target without registry service side effects.
    async with session_scope() as session:
        compute = ComputeRegistry(
            name="Local compute",
            bucket_size_bytes=1073741824,
            bucket_max_objects=10000,
            storage_reserve_percent=30,
            storage_object_overhead_bytes=65536,
            gateway_url="https://gateway.example",
            database_storage_class="local-path",
            storage_class="block-storage",
            storage_endpoint="https://storage.example",
            kubeconfig={"apiVersion": "v1", "clusters": []},
        )
        session.add(compute)
        await session.commit()
        return compute


async def create_ready_compute() -> ComputeRegistry:
    """Create a ready Compute registry without provider side effects."""

    # Test setup persists the exact assignable registry shape while avoiding provider side effects.
    async with session_scope() as session:
        suffix = uuid4().hex[:8]
        compute = ComputeRegistry(
            name=f"Local testing compute {suffix}",
            bucket_size_bytes=1073741824,
            bucket_max_objects=10000,
            storage_reserve_percent=30,
            storage_object_overhead_bytes=65536,
            kubeconfig={"apiVersion": "v1", "clusters": []},
            gateway_url="https://gateway.example",
            database_storage_class="local-path",
            storage_class="block-storage",
            storage_endpoint="https://storage.example",
            status=Status.running,
        )
        session.add(compute)
        await session.commit()
        return compute


async def create_organization(
    owner: User,
    name: str = "acme",
    compute: ComputeRegistry | None = None,
) -> Organization:
    """Create one Organization with the specified or independent ready Compute registry."""

    if compute is None:
        compute = await create_ready_compute()

    async with session_scope() as session:
        organization = await organizations.create(
            session,
            name,
            owner,
            compute_id=compute.id,
        )
        await session.commit()
        return organization


async def create_solution(
    organization: Organization,
    name: str = "dashboard",
    image: str = "ghcr.io/longlink/dashboard:latest",
    secrets: dict[str, str] | None = None,
) -> Solution:
    """Create one Solution with the specified Organization."""

    parsed_image = Image(image)
    resolved_image = parsed_image if "@" in image else Image(f"{parsed_image.registry}/{parsed_image.repository}@sha256:test")
    if organization.created_id is None:
        raise ValueError("Test organization must have a creator")

    async with session_scope() as session:
        solution = await solutions.create(
            session,
            organization.id,
            name,
            secrets={name: value for name, value in (secrets or {}).items() if not name.startswith("LONGLINK_")},
            user_id=organization.created_id,
            metadata=LongLinkMetadata(image=resolved_image),
        )
        solution.secrets = {name: value for name, value in (secrets or {}).items() if name.startswith("LONGLINK_")}
        await session.commit()
        return solution
