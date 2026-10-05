import pytest
from fastapi import Response
from src.utils import cookies
from http.cookies import SimpleCookie
from src.environments import env

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(("public_url", "expected_secure"), [("https://app.example.com", True), ("http://localhost:5173", False)])
def test_set_browser_cookie_marks_secure_only_on_https(monkeypatch: pytest.MonkeyPatch, public_url: str, expected_secure: bool) -> None:
    """Protect browser credentials and set Secure only for HTTPS origins."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", public_url)

    # Act
    response = Response()
    cookies.set_browser_cookie(response, cookies.AUTH_COOKIE, "value", "/", 60)
    header = response.headers["set-cookie"]

    # Assert
    assert ("Secure" in header) is expected_secure
    assert "HttpOnly" in header
    assert "SameSite=lax" in header
    assert response.headers["cache-control"] == "no-store"


def test_delete_browser_cookie_mirrors_registration_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete the registration credential on the same path used when setting it."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://app.example.com")

    # Act
    set_response = Response()
    cookies.set_browser_cookie(set_response, cookies.REGISTRATION_COOKIE, "value", "/api/v1/auth/register", 60)
    delete_response = Response()
    cookies.delete_browser_cookie(delete_response, cookies.REGISTRATION_COOKIE, "/api/v1/auth/register")

    # Assert
    set_cookie = SimpleCookie()
    set_cookie.load(set_response.headers["set-cookie"])
    delete_cookie = SimpleCookie()
    delete_cookie.load(delete_response.headers["set-cookie"])
    assert set_cookie[cookies.REGISTRATION_COOKIE]["path"] == "/api/v1/auth/register"
    assert delete_cookie[cookies.REGISTRATION_COOKIE]["path"] == "/api/v1/auth/register"
    assert "Max-Age=0" in delete_response.headers["set-cookie"]
    assert "Secure" in delete_response.headers["set-cookie"]
    assert "HttpOnly" in delete_response.headers["set-cookie"]
    assert "SameSite=lax" in delete_response.headers["set-cookie"]
