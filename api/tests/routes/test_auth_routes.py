import httpx
import pytest
from types import SimpleNamespace


@pytest.mark.unit
def test_logout_returns_ok_response(client):
    """Logout route returns success payload."""
    response = client.get("/logout")

    assert response.status_code == 200
    assert response.json() == {"ok": True}


@pytest.mark.unit
def test_login_oidc_handles_provider_metadata_failure(client, monkeypatch):
    """OIDC login route returns 502 when provider metadata fetch fails."""
    from src.routes import auth as auth_routes

    class _FailingOidcClient:
        async def authorize_redirect(self, request, redirect_uri: str):
            """Raise HTTP status error to emulate OIDC metadata outage."""
            request_info = httpx.Request(method="GET", url="https://issuer.example/.well-known")
            response = httpx.Response(status_code=503, request=request_info)
            raise httpx.HTTPStatusError("unavailable", request=request_info, response=response)

    monkeypatch.setattr(auth_routes.oauth, "create_client", lambda _: _FailingOidcClient())

    response = client.get("/login/oidc")

    assert response.status_code == 502
    assert "OIDC provider metadata is unavailable" in response.json()["detail"]


@pytest.mark.unit
def test_auth_oidc_sets_user_session_and_redirects(client, monkeypatch):
    """OIDC callback stores user in session and redirects to control plane URL."""
    from src.routes import auth as auth_routes

    async def fake_create_or_update_oidc_user(**kwargs):
        """Return fake user record persisted from userinfo claims."""
        return SimpleNamespace(id=77, **kwargs)

    class _OidcClient:
        async def authorize_access_token(self, request):
            """Return token containing userinfo payload."""
            return {
                "userinfo": {
                    "sub": "oidc-1",
                    "email": "user@example.com",
                    "name": "Test User",
                    "picture": "https://avatar",
                }
            }

    monkeypatch.setattr(auth_routes.oauth, "create_client", lambda _: _OidcClient())
    monkeypatch.setattr(auth_routes.db.users, "create_or_update_oidc_user", fake_create_or_update_oidc_user)

    response = client.get("/auth/oidc", follow_redirects=False)

    assert response.status_code == 307
    assert response.headers["location"] == "http://localhost:5173"
    assert "set-cookie" in {key.lower() for key in response.headers.keys()}
