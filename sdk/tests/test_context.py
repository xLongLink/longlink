import pytest
from uuid import UUID
from datetime import UTC, datetime, timedelta
from longlink import User, context, identity
from longlink.app import LongLink
from fastapi.testclient import TestClient

IDENTITY_SECRET = "test-identity-secret-01234567890"


def identity_headers(user: User) -> dict[str, str]:
    """Build one current Platform identity assertion for context tests."""

    # Use the shared token constructor used by the Platform gateway.
    return {"x-longlink-identity": identity.create_identity_token(user, IDENTITY_SECRET)}


@pytest.mark.usefixtures("solution_source")
def test_data_resolves_request_services(monkeypatch: pytest.MonkeyPatch) -> None:
    """Persist newer signed profiles and ignore equal or older snapshots."""

    # Arrange
    user_id = UUID(int=2)
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", IDENTITY_SECRET)
    app = LongLink()
    user = User(id=user_id, name="Original", email="user@example.com", updated_at=datetime.now(UTC))

    @app.get("/")
    async def get_context(value: context.Context) -> dict[str, str | bool]:
        """Expose dependency values for the request-boundary test."""

        return {"name": value.user.name, "storage_matches": value.storage is app.state.longlink.storage}

    async def read_profile() -> tuple[str, str, str]:
        """Read committed profile fields outside the request's identity map."""

        async with app.state.longlink.database.session() as session:
            persisted = await session.get(User, user_id)
            assert persisted is not None
            return persisted.name, persisted.email, persisted.avatar

    client = TestClient(app)

    # Act
    with client:
        response = client.get("/", headers=identity_headers(user))
        updated = user.model_copy(
            update={
                "name": "Updated",
                "email": "updated@example.com",
                "avatar": "https://example.com/updated.png",
                "updated_at": user.updated_at + timedelta(seconds=1),
            }
        )
        refreshed = client.get("/", headers=identity_headers(updated))
        conflicting = updated.model_copy(
            update={"name": "Conflicting", "email": "conflicting@example.com", "avatar": "https://example.com/conflicting.png"}
        )
        same_version = client.get("/", headers=identity_headers(conflicting))
        stale = client.get("/", headers=identity_headers(user))
        assert client.portal is not None
        persisted_profile = client.portal.call(read_profile)

    # Assert
    assert response.status_code == 200
    assert response.json() == {"name": "Original", "storage_matches": True}
    assert refreshed.status_code == 200
    assert refreshed.json() == {"name": "Updated", "storage_matches": True}
    assert same_version.status_code == 200
    assert same_version.json() == refreshed.json()
    assert stale.status_code == 200
    assert stale.json() == refreshed.json()
    assert persisted_profile == ("Updated", "updated@example.com", "https://example.com/updated.png")


@pytest.mark.usefixtures("solution_source")
def test_data_closes_database_session_when_endpoint_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    """Roll back business changes without rolling back the signed user profile."""

    # Arrange
    monkeypatch.setenv("LONGLINK_ENV", "testing")
    monkeypatch.setenv("LONGLINK_IDENTITY_SECRET", IDENTITY_SECRET)
    app = LongLink()
    user = User(id=UUID(int=2), name="Persisted", email="user@example.com")

    @app.get("/")
    async def fail(value: context.Context) -> None:
        """Fail after the context dependency opens its session."""

        value.user.name = "Rolled back"
        await value.database.flush()
        raise RuntimeError("endpoint failed")

    async def persisted_name() -> str:
        """Read the profile independently of the failed request session."""

        async with app.state.longlink.database.session() as session:
            persisted = await session.get(User, user.id)
            assert persisted is not None
            return persisted.name

    # Act
    with TestClient(app) as client:
        with pytest.raises(RuntimeError, match="endpoint failed"):
            client.get("/", headers=identity_headers(user))

        # Assert the independent profile transaction survived the failed business transaction.
        assert client.portal is not None
        assert client.portal.call(persisted_name) == "Persisted"
