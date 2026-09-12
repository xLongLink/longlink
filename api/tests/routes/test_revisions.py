import pytest
import asyncio
from uuid import uuid4
from httpx2 import AsyncClient
from sqlmodel import col
from factories import claim_operation, create_solution, complete_operation, create_organization
from sqlalchemy import text, select
from sqlalchemy.exc import IntegrityError
from src.models.types import Image
from longlink.utils.time import utcnow
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.database.session import session_scope
from src.models.operations import OperationKind
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.operations import Operation


async def test_update_history_and_explicit_rollback(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Authorize revision commands, encrypt snapshots, and retain history across rollback."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    other = await create_solution(organization, name="other")
    initial_id = solution.desired_revision_id

    resolved: LongLinkMetadata | None = None

    async def metadata(_image: Image) -> LongLinkMetadata | None:
        """Return registry-pinned image metadata at the external boundary."""

        return resolved

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    url = f"/api/v1/solutions/{solution.id}"
    payload = {"image": "ghcr.io/longlink/dashboard:latest", "envs": {"KEY": "revision-secret"}}

    # Act and assert
    assert (await clients[1].put(url, json=payload)).status_code == 403
    assert (await clients[0].put(url, json={**payload, "envs": {"LONGLINK_ENV": "bad"}})).status_code == 422
    assert (await clients[0].put(url, json=payload)).status_code == 404
    resolved = LongLinkMetadata(
        image=Image("ghcr.io/longlink/dashboard@sha256:resolved"), environments=[EnvironmentMetadata(name="KEY", required=True)]
    )
    assert (await clients[0].put(url, json={**payload, "envs": {}})).status_code == 422
    assert (await clients[0].put(url, json=payload)).status_code == 204
    history = await clients[0].get(f"{url}/revisions")
    assert history.status_code == 200
    assert len(history.json()) == 2
    assert "revision-secret" not in history.text and '"envs"' not in history.text
    assert history.json()[0]["image"] == "ghcr.io/longlink/dashboard@sha256:resolved"
    assert (await clients[1].get(f"{url}/revisions")).status_code == 403

    # Arrange: Snapshot desired revisions and queued work before rejected rollbacks.
    desired_revisions_query = (
        select(Solution.id, Solution.desired_revision_id).where(col(Solution.organization_id) == organization.id).order_by(Solution.id)
    )
    operations_query = select(Operation.__table__).order_by(Operation.id)
    async with session_scope() as session:
        desired_revisions_result = await session.execute(desired_revisions_query)
        desired_revisions_before = desired_revisions_result.all()
        operations_result = await session.execute(operations_query)
        operations_before = operations_result.all()

    # Act
    foreign_revision_response = await clients[0].post(f"{url}/revisions/{other.desired_revision_id}/rollback")

    # Assert
    assert foreign_revision_response.status_code == 404
    assert foreign_revision_response.json() == {"detail": "Revision not found"}
    async with session_scope() as session:
        desired_revisions_result = await session.execute(desired_revisions_query)
        assert desired_revisions_result.all() == desired_revisions_before
        operations_result = await session.execute(operations_query)
        assert operations_result.all() == operations_before

    # Act
    undeployed_revision_response = await clients[0].post(f"{url}/revisions/{initial_id}/rollback")

    # Assert
    assert undeployed_revision_response.status_code == 409
    assert undeployed_revision_response.json() == {"detail": "Revision has never been deployed successfully"}
    async with session_scope() as session:
        desired_revisions_result = await session.execute(desired_revisions_query)
        assert desired_revisions_result.all() == desired_revisions_before
        operations_result = await session.execute(operations_query)
        assert operations_result.all() == operations_before

    # Arrange: Mark setup deployments complete so operation completion does not requeue them.
    async with session_scope() as session:
        initial = await session.get(Revision, initial_id)
        assert initial is not None
        initial.deployed_at = utcnow()
        current = await session.get(Solution, solution.id)
        assert current is not None
        updated_id = current.desired_revision_id
        current.deployed_revision_id = updated_id
        other_current = await session.get(Solution, other.id)
        assert other_current is not None
        other_current.deployed_revision_id = other.desired_revision_id
        await session.commit()
        encrypted = await session.execute(text("SELECT envs FROM revisions"))
        assert "revision-secret" not in str(encrypted.all())

    original_operation_id = None
    for kind, target_id in (
        (OperationKind.organization_create, organization.id),
        (OperationKind.solution_deploy, initial_id),
        (OperationKind.solution_deploy, other.desired_revision_id),
        (OperationKind.solution_deploy, updated_id),
    ):
        setup_operation = await claim_operation()
        assert setup_operation is not None
        assert (setup_operation.kind, setup_operation.target_id) == (kind, target_id)
        if target_id == initial_id:
            original_operation_id = setup_operation.id
        assert await complete_operation(setup_operation.id) is not None
    assert original_operation_id is not None

    # Act
    response = await clients[0].post(f"{url}/revisions/{initial_id}/rollback")

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None and current.desired_revision_id == initial_id
        operation = await session.scalar(
            select(Operation).where(
                col(Operation.kind) == OperationKind.solution_deploy,
                col(Operation.target_id) == initial_id,
                col(Operation.finished_at).is_(None),
            )
        )
        assert operation is not None
        assert operation.id != original_operation_id
        assert operation.kind == OperationKind.solution_deploy
        assert operation.target_id == initial_id
        assert operation.finished_at is None
    assert len((await clients[0].get(f"{url}/revisions")).json()) == 2


@pytest.mark.parametrize("reference", ["desired_revision_id", "deployed_revision_id"])
async def test_revision_references_require_same_solution(users: tuple[User, User, User], reference: str) -> None:
    """Database constraints reject cross-Solution references independently of routes."""

    organization = await create_organization(users[0])
    first = await create_solution(organization)
    second = await create_solution(organization, name="other")
    async with session_scope() as session:
        current = await session.get(Solution, first.id)
        assert current is not None
        setattr(current, reference, second.desired_revision_id)
        with pytest.raises(IntegrityError):
            await session.commit()


@pytest.mark.parametrize(
    ("field", "replacement"),
    [
        ("id", uuid4()),
        ("solution_id", uuid4()),
        ("image", "ghcr.io/longlink/dashboard@sha256:replacement"),
        ("source", "ghcr.io/longlink/dashboard:replacement"),
        ("envs", {"KEY": "replacement"}),
        ("created_at", utcnow()),
        ("created_id", uuid4()),
    ],
)
async def test_revision_snapshot_cannot_be_modified(users: tuple[User, User, User], field: str, replacement: object) -> None:
    """Persist observed state but reject rewriting an existing release snapshot."""

    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    async with session_scope() as session:
        revision = await session.get(Revision, solution.desired_revision_id)
        assert revision is not None
        setattr(revision, field, replacement)
        with pytest.raises(ValueError, match="immutable"):
            await session.commit()


async def test_source_update_preserves_patches_and_reresolves(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Keep source identity, validate final metadata, and expose names rather than secrets."""

    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}"
    source = "ghcr.io/longlink/dashboard:latest"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"))
    inspected: list[str] = []

    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve the mutable registry tag at the external boundary."""

        inspected.append(image)
        return resolved

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    assert (await clients[0].put(url, json={"image": source})).status_code == 204
    history = (await clients[0].get(f"{url}/revisions")).json()
    assert history[0]["source"] == source
    assert history[0]["configured_envs"] == ["DROP", "KEEP"]
    assert history[0]["min_scale"] == 0
    assert "private-value" not in str(history)

    # Source checks require maintenance and cannot be used as a registry oracle by other users.
    inspected.clear()
    assert (await clients[1].get(f"{url}/update")).status_code == 403
    assert (await clients[1].post(f"{url}/update", json={})).status_code == 403
    assert inspected == []
    assert (await clients[0].post(f"{url}/update", json={"expected_revision_id": str(uuid4())})).status_code == 409
    assert (await clients[0].put(url, json={"image": source, "expected_revision_id": str(uuid4())})).status_code == 409
    assert inspected == []
    check = await clients[0].get(f"{url}/update")
    assert check.status_code == 200 and check.json()["available"] is False
    assert check.json()["source"] == source
    assert check.json()["current_image"] == check.json()["image"] == resolved.image
    assert check.json()["configured_envs"] == ["DROP", "KEEP"]
    assert "private-value" not in check.text
    assert check.json()["min_scale"] == 0
    assert (await clients[0].post(f"{url}/update", json={"envs": {"KEEP": "private-value"}})).status_code == 409
    assert len((await clients[0].get(f"{url}/revisions")).json()) == 2
    assert (await clients[0].post(f"{url}/update", json={"min_scale": 1})).status_code == 204
    assert (await clients[0].post(f"{url}/update", json={"min_scale": 1})).status_code == 409
    assert (await clients[0].post(f"{url}/update", json={"min_scale": 2})).status_code == 422

    # A review is advisory: submission re-resolves a moved tag and enforces its new requirements.
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:candidate"))
    check = await clients[0].get(f"{url}/update")
    assert check.json()["available"] is True
    assert check.json()["current_image"] == "ghcr.io/longlink/dashboard@sha256:first"
    assert check.json()["image"] == resolved.image
    resolved = LongLinkMetadata(
        image=Image("ghcr.io/longlink/dashboard@sha256:final"),
        environments=[EnvironmentMetadata(name="NEW", required=True), EnvironmentMetadata(name="KEEP", required=True)],
    )
    missing = await clients[0].post(f"{url}/update", json={})
    assert missing.status_code == 422 and "NEW" in missing.text
    invalid = await clients[0].post(f"{url}/update", json={"envs": {"LONGLINK_KEY": "private-value"}})
    assert invalid.status_code == 422 and "private-value" not in invalid.text
    assert (await clients[0].post(f"{url}/update", json={"envs": {"NEW": "new-value", "KEEP": None}})).status_code == 422
    assert (await clients[0].post(f"{url}/update", json={"envs": {"NEW": "new-value", "DROP": None}})).status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision.image == resolved.image
        assert current.desired_revision.source == source
        assert current.desired_revision.min_scale == 1
        assert current.desired_revision.envs == {"KEEP": "private-value", "NEW": "new-value"}
        assert current.deployment_pending
        prior = await session.get(Revision, solution.desired_revision_id)
        assert prior is not None and prior.envs == {"KEEP": "private-value", "DROP": "old-value"}
    assert inspected[-1] == source

    # Manual digest sources have no implicit tag channel; explicit null removes, omitted keys remain.
    digest = str(resolved.image)
    assert (await clients[0].put(url, json={"image": digest, "envs": {"NEW": "replacement"}})).status_code == 204
    check = await clients[0].get(f"{url}/update")
    assert check.json()["source"] == digest and check.json()["available"] is False
    assert check.json()["min_scale"] == 1
    assert inspected[-1] == digest
    assert (await clients[0].post(f"{url}/update", json={"min_scale": 0})).status_code == 204
    assert (await clients[0].get(f"{url}/update")).json()["min_scale"] == 0


@pytest.mark.parametrize("method", ["GET", "POST", "PUT"])
async def test_release_inspection_revalidates_concurrent_desired_changes(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch, method: str
) -> None:
    """Reject stale candidates without holding command locks across registry waits."""

    from src.database.services import solutions

    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    metadata = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"))
    replacement_id = None

    async def inspect(_image: Image) -> LongLinkMetadata:
        """Commit a competing command while the original lookup is still waiting."""

        nonlocal replacement_id
        async with session_scope() as session:
            current = await solutions.access(session, solution.id, users[0].id)
            await solutions.deploy(session, current, users[0].id, metadata, {"OTHER": "concurrent-secret"})
            replacement_id = current.desired_revision_id
            await session.commit()
        return metadata

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", inspect)
    url = f"/api/v1/solutions/{solution.id}"
    response = await clients[0].request(method, url if method == "PUT" else f"{url}/update", json={"image": str(metadata.image)})
    assert response.status_code == 409
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None and current.desired_revision_id == replacement_id
        assert current.desired_revision.envs == {"OTHER": "concurrent-secret"}


async def test_environment_patch_validates_merged_limits(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Apply limits to preserved plus new values and permit explicit removals."""

    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={f"KEY_{index}": "value" for index in range(100)})
    image = Image("ghcr.io/longlink/dashboard@sha256:next")

    async def metadata(_image: Image) -> LongLinkMetadata:
        """Provide a valid release without additional required variables."""

        return LongLinkMetadata(image=image)

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    url = f"/api/v1/solutions/{solution.id}"
    assert (await clients[0].put(url, json={"image": image, "envs": {"NEW": "secret"}})).status_code == 422
    assert (await clients[0].put(url, json={"image": image, "envs": {"NEW": "", "KEY_0": None}})).status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None and len(current.desired_revision.envs) == 100
        assert current.desired_revision.envs["NEW"] == "" and "KEY_0" not in current.desired_revision.envs

    # Individually valid patches must also respect the byte limit after merging retained values.
    large = await create_solution(organization, name="large", secrets={f"KEY_{index}": "x" * 32768 for index in range(15)})
    response = await clients[0].put(f"/api/v1/solutions/{large.id}", json={"image": image, "envs": {"NEW": "x" * 32768}})
    assert response.status_code == 422 and "too large" in response.text


async def test_simultaneous_source_updates_create_only_one_revision(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Serialize competing source updates on SQLite, including their preserved values."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value"})
    barrier = asyncio.Barrier(2)

    async def metadata(_image: Image) -> LongLinkMetadata:
        """Let both commands inspect before either reacquires a command lock."""

        await asyncio.wait_for(barrier.wait(), timeout=5)
        return LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:new"))

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    url = f"/api/v1/solutions/{solution.id}/update"

    # Act
    responses = await asyncio.gather(
        clients[0].post(url, json={"envs": {"LEFT": "left"}}),
        clients[0].post(url, json={"envs": {"RIGHT": "right"}}),
    )

    # Assert
    assert sorted(response.status_code for response in responses) == [204, 409]
    winning_patch = {"LEFT": "left"} if responses[0].status_code == 204 else {"RIGHT": "right"}
    expected_envs = {"KEEP": "private-value", **winning_patch}
    history_response = await clients[0].get(f"/api/v1/solutions/{solution.id}/revisions")
    assert history_response.status_code == 200
    history = history_response.json()
    assert len(history) == 2
    assert history[0]["configured_envs"] == sorted(expected_envs)

    # Verify the successful request's complete snapshot was persisted.
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision.envs == expected_envs


@pytest.mark.integration
async def test_local_registry_release_roundtrip(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User]
) -> None:
    """Exercise the real local registry without changing its tag or any development Platform state."""

    from src.utils import images

    # All Platform mutations use the isolated test database; registry requests are read-only.
    source = Image("localhost:15000/sample:dev")
    metadata = await images.metadata(source)
    if metadata is None:
        pytest.skip("Local sample registry image is unavailable")
    organization = await create_organization(users[0])
    envs = {item.name: "integration-value" for item in metadata.environments}
    response = await clients[0].post(
        f"/api/v1/organizations/{organization.id}/solutions",
        json={
            "name": "Local sample",
            "image": source,
            "envs": envs,
        },
    )
    assert response.status_code == 204
    listing = await clients[0].get(f"/api/v1/organizations/{organization.id}/solutions")
    assert listing.status_code == 200 and listing.json()[0]["deployment_pending"]
    solution_id = listing.json()[0]["id"]
    url = f"/api/v1/solutions/{solution_id}"
    check = await clients[0].get(f"{url}/update")
    assert check.status_code == 200
    assert check.json()["source"] == source and check.json()["image"] == metadata.image
    assert check.json()["available"] is False
    assert "integration-value" not in check.text
    assert (await clients[0].post(f"{url}/update", json={})).status_code == 409
    assert (await clients[0].put(url, json={"image": source, "envs": {"EXTRA": "replacement"}})).status_code == 204
    history = await clients[0].get(f"{url}/revisions")
    assert len(history.json()) == 2 and history.json()[0]["source"] == source
    assert history.json()[0]["configured_envs"] == sorted({*envs, "EXTRA"})
