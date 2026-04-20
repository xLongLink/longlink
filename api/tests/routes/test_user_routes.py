import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_get_user_details_returns_authenticated_user(client):
    """Me route returns dependency-injected authenticated user."""
    from main import app
    from src.auth import authuser

    async def fake_authuser():
        """Return fake authenticated user object."""
        return SimpleNamespace(id=1, name="Ada", email="ada@example.com", avatar=None)

    app.dependency_overrides[authuser] = fake_authuser

    response = client.get("/me")

    assert response.status_code == 200
    assert response.json()["name"] == "Ada"


@pytest.mark.unit
def test_patch_user_details_updates_with_payload(client, monkeypatch):
    """Patch me route updates user when payload has mutable fields."""
    from main import app
    from src.auth import authuser
    from src.routes import auth as auth_routes

    async def fake_authuser():
        """Return fake authenticated user object."""
        return SimpleNamespace(id=2, name="Before", email="before@example.com", avatar=None)

    async def fake_update(user_id: int, **params):
        """Return fake updated user object with merged fields."""
        return SimpleNamespace(id=user_id, name=params["name"], email="before@example.com", avatar=None)

    app.dependency_overrides[authuser] = fake_authuser
    monkeypatch.setattr(auth_routes.db.users, "update", fake_update)

    response = client.patch("/me", json={"name": "After"})

    assert response.status_code == 200
    assert response.json()["id"] == 2
    assert response.json()["name"] == "After"
