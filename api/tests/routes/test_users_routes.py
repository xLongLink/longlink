import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_list_users_returns_mapped_user_responses(client, monkeypatch):
    """Users route returns user records mapped to response schema."""
    from main import app
    from src.auth import authuser
    from src.routes import users as users_routes

    async def fake_authuser():
        """Return fake authenticated user required by route guard."""
        return SimpleNamespace(id=99)

    async def fake_list():
        """Return fake users from users service."""
        return [
            SimpleNamespace(
                id=1,
                name="Ada",
                email="ada@example.com",
                avatar="https://avatar",
                oidc_subject="oidc-ada",
            )
        ]

    app.dependency_overrides[authuser] = fake_authuser
    monkeypatch.setattr(users_routes.db.users, "list", fake_list)

    response = client.get("/users")

    assert response.status_code == 200
    assert response.json() == [
        {
            "id": 1,
            "name": "Ada",
            "email": "ada@example.com",
            "avatar": "https://avatar",
            "oidc_subject": "oidc-ada",
        }
    ]
