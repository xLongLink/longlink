import pytest
import asyncio
from uuid import UUID, uuid4
from httpx2 import AsyncClient
from datetime import UTC, datetime
from sqlmodel import col
from factories import create_solution, create_organization
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from src.models.roles import OrganizationRoles
from src.models.types import Image
from src.models.metadata import LongLinkMetadata, EnvironmentMetadata
from src.database.session import session_scope
from src.database.models.users import User
from src.database.models.solutions import Revision, Solution
from src.database.models.association import UserOrganization


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
        ("created_at", datetime.now(UTC)),
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


async def test_update_noop_preserves_source_and_patches(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Preserve source identity and patches when resubmitting an unchanged release."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    source = "ghcr.io/longlink/dashboard@sha256:test"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"))

    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve metadata for the persisted source at the external boundary."""

        assert image == source
        return resolved

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)

    # Act
    response = await clients[0].post(url, json={})

    # Assert
    assert response.status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        revision = await session.get(Revision, current.desired_revision_id)
        assert revision is not None
        assert revision.source == source
        assert revision.configured_envs == ["DROP", "KEEP"]
        assert revision.min_scale == 0


async def test_update_rejects_unauthorized_and_stale_revision(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject update inspection without maintain access and stale revision submissions."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    inspected: list[str] = []

    async def metadata(image: Image) -> LongLinkMetadata:
        """Fail if denied or stale submissions reach image resolution."""

        inspected.append(image)
        return LongLinkMetadata(image=image)

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)

    # Act
    forbidden_get = await clients[1].get(url)
    forbidden_post = await clients[1].post(url, json={})
    stale_response = await clients[0].post(url, json={"expected_revision_id": str(uuid4())})

    # Assert
    assert forbidden_get.status_code == 403
    assert forbidden_post.status_code == 403
    assert stale_response.status_code == 409
    assert inspected == []


async def test_update_check_exposes_names_without_secrets(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Expose configured environment names without values in the advisory check."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"))

    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve metadata for the persisted source at the external boundary."""

        return resolved

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    assert (await clients[0].post(url, json={})).status_code == 204

    # Act
    check = await clients[0].get(url)

    # Assert
    assert check.status_code == 200
    check_payload = check.json()
    assert check_payload["current_image"] == check_payload["metadata"]["image"] == resolved.image
    assert {"source", "image", "available"}.isdisjoint(check_payload)
    assert check_payload["configured_envs"] == ["DROP", "KEEP"]
    assert check_payload["min_scale"] == 0
    assert "private-value" not in check.text


async def test_update_enforces_idempotency_and_min_scale_bounds(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Reject unchanged resubmissions and out-of-range scale settings."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"))

    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve metadata for the persisted source at the external boundary."""

        return resolved

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    assert (await clients[0].post(url, json={})).status_code == 204

    # Act
    unchanged_response = await clients[0].post(url, json={"envs": {"KEEP": "private-value"}})
    grow_response = await clients[0].post(url, json={"min_scale": 1})
    repeat_response = await clients[0].post(url, json={"min_scale": 1})
    invalid_response = await clients[0].post(url, json={"min_scale": 2})

    # Assert
    assert unchanged_response.status_code == 409
    assert grow_response.status_code == 204
    assert repeat_response.status_code == 409
    assert invalid_response.status_code == 422
    async with session_scope() as session:
        assert await session.scalar(select(func.count()).select_from(Revision).where(col(Revision.solution_id) == solution.id)) == 3


async def test_update_reresolves_moved_tag_and_enforces_required_envs(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient], users: tuple[User, User, User], monkeypatch: pytest.MonkeyPatch
) -> None:
    """Re-resolve a moved tag on submission and enforce its new required variables."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization, secrets={"KEEP": "private-value", "DROP": "old-value"})
    url = f"/api/v1/solutions/{solution.id}/update"
    source = "ghcr.io/longlink/dashboard@sha256:test"
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:first"))
    inspected: list[str] = []

    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve the current candidate metadata at the external boundary."""

        inspected.append(image)
        return resolved

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)
    assert (await clients[0].post(url, json={})).status_code == 204
    assert (await clients[0].post(url, json={"min_scale": 1})).status_code == 204

    # Act: the advisory check observes the moved tag without persisting it.
    resolved = LongLinkMetadata(image=Image("ghcr.io/longlink/dashboard@sha256:candidate"))
    check = await clients[0].get(url)

    # Assert the check is advisory before enforcing the new requirements.
    assert check.json()["current_image"] == "ghcr.io/longlink/dashboard@sha256:first"
    assert check.json()["metadata"]["image"] == resolved.image

    # Arrange the final requirements.
    resolved = LongLinkMetadata(
        image=Image("ghcr.io/longlink/dashboard@sha256:final"),
        environments=[EnvironmentMetadata(name="NEW", required=True), EnvironmentMetadata(name="KEEP", required=True)],
    )

    # Act
    missing = await clients[0].post(url, json={})
    invalid = await clients[0].post(url, json={"envs": {"LONGLINK_KEY": "private-value"}})
    keep_removed = await clients[0].post(url, json={"envs": {"NEW": "new-value", "KEEP": None}})
    success = await clients[0].post(url, json={"envs": {"NEW": "new-value", "DROP": None}})

    # Assert
    assert missing.status_code == 422 and "NEW" in missing.text
    assert invalid.status_code == 422 and "private-value" not in invalid.text
    assert keep_removed.status_code == 422
    assert success.status_code == 204
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


@pytest.mark.parametrize(
    ("role", "status", "detail"),
    [
        pytest.param(None, 403, "Access required", id="non-member"),
        pytest.param(OrganizationRoles.read, 403, "Permission required", id="read-member"),
        pytest.param(OrganizationRoles.write, 403, "Permission required", id="write-member"),
    ],
)
async def test_update_check_rejects_callers_without_maintain_access(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
    role: OrganizationRoles | None,
    status: int,
    detail: str,
) -> None:
    """Require maintain access before inspecting or re-resolving a desired release."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    if role is not None:
        async with session_scope() as session:
            session.add(UserOrganization(user_id=users[1].id, organization_id=organization.id, role=role))
            await session.commit()
    url = f"/api/v1/solutions/{solution.id}/update"

    async def unexpected_metadata(_image: Image) -> LongLinkMetadata:
        """Fail if denied inspection reaches remote image resolution."""

        raise AssertionError("denied update check must not inspect image metadata")

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", unexpected_metadata)

    # Act
    get_response = await clients[1].get(url)
    post_response = await clients[1].post(url, json={})

    # Assert
    assert get_response.status_code == status
    assert get_response.json() == {"detail": detail}
    assert post_response.status_code == status
    assert post_response.json() == {"detail": detail}


async def test_update_check_allows_maintainer_without_registry_oracle(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
    users: tuple[User, User, User],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Allow maintainers to inspect the desired release source."""

    # Arrange
    organization = await create_organization(users[0])
    solution = await create_solution(organization)
    async with session_scope() as session:
        session.add(UserOrganization(user_id=users[1].id, organization_id=organization.id, role=OrganizationRoles.maintain))
        await session.commit()
    url = f"/api/v1/solutions/{solution.id}/update"

    async def metadata(image: Image) -> LongLinkMetadata:
        """Resolve metadata for the persisted source at the external boundary."""

        return LongLinkMetadata(image=image)

    monkeypatch.setattr("src.routes.v1.solutions.images.metadata", metadata)

    # Act
    response = await clients[1].get(url)

    # Assert
    assert response.status_code == 200
    assert response.json()["configured_envs"] == []


@pytest.mark.parametrize("method", ["GET", "POST"])
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
    url = f"/api/v1/solutions/{solution.id}/update"
    response = await clients[0].request(method, url, json={})
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
    url = f"/api/v1/solutions/{solution.id}/update"
    assert (await clients[0].post(url, json={"envs": {"NEW": "secret"}})).status_code == 422
    assert (await clients[0].post(url, json={"envs": {"NEW": "", "KEY_0": None}})).status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None and len(current.desired_revision.envs) == 100
        assert current.desired_revision.envs["NEW"] == "" and "KEY_0" not in current.desired_revision.envs

    # Individually valid patches must also respect the byte limit after merging retained values.
    large = await create_solution(organization, name="large", secrets={f"KEY_{index}": "x" * 32768 for index in range(15)})
    response = await clients[0].post(f"/api/v1/solutions/{large.id}/update", json={"envs": {"NEW": "x" * 32768}})
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

    # Verify the successful request's complete snapshot was persisted.
    async with session_scope() as session:
        current = await session.get(Solution, solution.id)
        assert current is not None
        assert current.desired_revision.envs == expected_envs
        assert await session.scalar(select(func.count()).select_from(Revision).where(col(Revision.solution_id) == solution.id)) == 2


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
    solution_id = UUID(listing.json()[0]["id"])
    url = f"/api/v1/solutions/{solution_id}/update"
    check = await clients[0].get(url)
    assert check.status_code == 200
    assert check.json()["current_image"] == check.json()["metadata"]["image"] == metadata.image
    assert {"source", "image", "available"}.isdisjoint(check.json())
    assert "integration-value" not in check.text
    assert (await clients[0].post(url, json={})).status_code == 409
    assert (await clients[0].post(url, json={"envs": {"EXTRA": "replacement"}})).status_code == 204
    async with session_scope() as session:
        current = await session.get(Solution, solution_id)
        assert current is not None
        revision = await session.get(Revision, current.desired_revision_id)
        assert revision is not None
        assert revision.source == source
        assert revision.configured_envs == sorted({*envs, "EXTRA"})
