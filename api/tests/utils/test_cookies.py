import pytest
from fastapi import Response
from src.utils import cookies
from src.environments import env

pytestmark = pytest.mark.no_db


def test_set_browser_cookie_marks_secure_only_on_https(monkeypatch: pytest.MonkeyPatch) -> None:
    """Set the Secure attribute only when the public origin uses HTTPS."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://app.example.com")

    # Act
    secure_response = Response()
    cookies.set_browser_cookie(secure_response, cookies.AUTH_COOKIE, "value", "/", 60)
    secure_header = secure_response.headers["set-cookie"]

    # Assert
    assert "Secure" in secure_header

    # Arrange a plaintext loopback origin for the insecure case.
    monkeypatch.setattr(env, "PUBLIC_URL", "http://localhost:5173")

    # Act
    plain_response = Response()
    cookies.set_browser_cookie(plain_response, cookies.AUTH_COOKIE, "value", "/", 60)

    # Assert
    assert "Secure" not in plain_response.headers["set-cookie"]


def test_set_browser_cookie_is_http_only_lax_and_not_cacheable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Protect browser credentials from JavaScript, CSRF reuse, and intermediary caching."""

    # Arrange
    monkeypatch.setattr(env, "PUBLIC_URL", "https://app.example.com")

    # Act
    response = Response()
    cookies.set_browser_cookie(response, cookies.AUTH_COOKIE, "value", "/", 60)
    header = response.headers["set-cookie"]

    # Assert
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
    assert "Path=/api/v1/auth/register" in set_response.headers["set-cookie"]
    assert "Path=/api/v1/auth/register" in delete_response.headers["set-cookie"]
    assert "Max-Age=0" in delete_response.headers["set-cookie"]
