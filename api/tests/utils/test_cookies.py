import pytest
from fastapi import Response
from src.utils import cookies
from http.cookies import SimpleCookie
from src.environments import env

pytestmark = pytest.mark.no_db


def test_set_browser_cookie_marks_secure_only_on_https(monkeypatch: pytest.MonkeyPatch) -> None:
    """Protect browser credentials and set Secure only for HTTPS origins."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://app.example.com")

    # Act
    secure_response = Response()
    cookies.set_browser_cookie(secure_response, cookies.AUTH_COOKIE, "value", "/", 60)
    secure_header = secure_response.headers["set-cookie"]

    # Assert
    assert "Secure" in secure_header
    assert "HttpOnly" in secure_header
    assert "SameSite=lax" in secure_header
    assert secure_response.headers["cache-control"] == "no-store"

    # Arrange a plaintext loopback origin for the insecure case.
    monkeypatch.setattr(env, "PUBLIC_URL", "http://localhost:5173")

    # Act
    plain_response = Response()
    cookies.set_browser_cookie(plain_response, cookies.AUTH_COOKIE, "value", "/", 60)

    # Assert
    assert "Secure" not in plain_response.headers["set-cookie"]


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
    assert delete_response.headers["set-cookie"].startswith(f"{cookies.REGISTRATION_COOKIE}=")
    assert "Secure" in delete_response.headers["set-cookie"]
    assert "HttpOnly" in delete_response.headers["set-cookie"]
    assert "SameSite=lax" in delete_response.headers["set-cookie"]
