import time
import re
from collections.abc import Iterator
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import httpx2
import pytest
from docker.errors import DockerException
from fastapi.testclient import TestClient
from authlib.integrations.starlette_client import OAuth
from testcontainers.core.container import DockerContainer
from main import app
from src.routes import auth as auth_routes
from src import auth as auth_module


KEYCLOAK_IMAGE = "quay.io/keycloak/keycloak:25.0"
KEYCLOAK_REALM_NAME = "dev"
KEYCLOAK_REALM_FILE = Path(__file__).resolve().parents[3] / "dev" / "keycloak-realm-dev.json"
KEYCLOAK_CLIENT_ID = "longlink-api"
KEYCLOAK_CLIENT_SECRET = "longlink-secret"
KEYCLOAK_ADMIN_USERNAME = "admin"
KEYCLOAK_ADMIN_PASSWORD = "admin"
KEYCLOAK_REDIRECT_URI = "http://localhost:5173/auth/oidc"


def _wait_for_keycloak(issuer_url: str) -> None:
    """Wait for Keycloak's OIDC discovery endpoint to become reachable."""

    discovery_url = f"{issuer_url}/.well-known/openid-configuration"
    for _ in range(120):
        try:
            response = httpx2.get(discovery_url, timeout=1.0)
            if response.status_code == 200:
                return
        except httpx2.RequestError:
            pass
        time.sleep(0.5)

    pytest.fail("Keycloak did not become ready for authentication integration tests")


@pytest.fixture(scope="session")
def keycloak_issuer() -> Iterator[str]:
    """Start Keycloak with the local test realm and return its issuer URL."""

    container = (
        DockerContainer(KEYCLOAK_IMAGE)
        .with_env("KEYCLOAK_ADMIN", KEYCLOAK_ADMIN_USERNAME)
        .with_env("KEYCLOAK_ADMIN_PASSWORD", KEYCLOAK_ADMIN_PASSWORD)
        .with_env("KC_BOOTSTRAP_ADMIN_USERNAME", KEYCLOAK_ADMIN_USERNAME)
        .with_env("KC_BOOTSTRAP_ADMIN_PASSWORD", KEYCLOAK_ADMIN_PASSWORD)
        .with_exposed_ports(8080)
        .with_volume_mapping(str(KEYCLOAK_REALM_FILE), "/opt/keycloak/data/import/dev.json")
        .with_command("start-dev --http-port=8080 --import-realm")
    )

    try:
        container.start()
    except DockerException as exc:
        pytest.skip(f"Docker is not available for Keycloak integration tests: {exc}")

    issuer = (
        f"http://{container.get_container_host_ip()}:{container.get_exposed_port(8080)}/"
        f"realms/{KEYCLOAK_REALM_NAME}"
    )
    try:
        _wait_for_keycloak(issuer)
        yield issuer
    finally:
        container.stop()


@pytest.fixture
def keycloak_client(monkeypatch: pytest.MonkeyPatch, keycloak_issuer: str) -> Iterator[TestClient]:
    """Build a test client with runtime OIDC settings for the Keycloak container."""

    monkeypatch.setattr(auth_routes.env, "OIDC_ISSUER", keycloak_issuer)
    monkeypatch.setattr(auth_routes.env, "OIDC_CLIENT_ID", KEYCLOAK_CLIENT_ID)
    monkeypatch.setattr(auth_routes.env, "OIDC_CLIENT_SECRET", KEYCLOAK_CLIENT_SECRET)
    monkeypatch.setattr(auth_routes.env, "OIDC_REDIRECT_URI", KEYCLOAK_REDIRECT_URI)

    keycloak_oauth = OAuth()
    keycloak_oauth.register(
        name="oidc",
        client_id=KEYCLOAK_CLIENT_ID,
        client_secret=KEYCLOAK_CLIENT_SECRET,
        server_metadata_url=f"{keycloak_issuer}/.well-known/openid-configuration",
        client_kwargs={"scope": "openid profile email"},
    )
    monkeypatch.setattr(auth_module, "oauth", keycloak_oauth)
    monkeypatch.setattr(auth_routes, "oauth", keycloak_oauth)

    client = TestClient(app)
    try:
        yield client
    finally:
        client.close()


def _extract_keycloak_login_parameters(login_html: str, expected_action_prefix: str) -> tuple[str, dict[str, str]]:
    """Extract the login action URL and hidden fields from the Keycloak login form."""

    form_match = re.search(
        r'<form[^>]+id="kc-form-login"[^>]*action="([^"]+)"[^>]*>(.*?)</form>',
        login_html,
        re.S,
    )
    if form_match is None:
        pytest.fail("Could not locate Keycloak login form in authorization response")

    form_action = form_match.group(1).replace("&amp;", "&")
    if not form_action.startswith(expected_action_prefix):
        pytest.fail(f"Unexpected Keycloak login form action: {form_action}")

    parsed_form = urlsplit(form_action)
    form_payload = parse_qs(parsed_form.query)
    return (
        f"{parsed_form.scheme}://{parsed_form.netloc}{parsed_form.path}",
        {key: values[0] for key, values in form_payload.items()},
    )


def _parse_query(location: str) -> dict[str, str]:
    """Extract first-value query params from a URL."""

    parsed = urlsplit(location)
    return {key: values[0] for key, values in parse_qs(parsed.query).items()}


@pytest.mark.integration
def test_login_oidc_redirects_to_keycloak_and_authenticates_session(keycloak_client: TestClient, keycloak_issuer: str) -> None:
    """Run the full OIDC login flow using the running Keycloak container."""

    authorize_response = keycloak_client.get(
        "/auth/login/oidc?next=/organizations",
        follow_redirects=False,
    )

    assert authorize_response.status_code == 302
    authorize_url = authorize_response.headers.get("location")
    assert authorize_url
    authorize_parts = urlsplit(authorize_url)
    assert authorize_parts.path.endswith("/protocol/openid-connect/auth")
    assert authorize_parts.netloc
    assert authorize_parts.netloc == keycloak_issuer.split("//", 1)[1].split("/", 1)[0]

    query = parse_qs(authorize_parts.query)
    assert query["client_id"] == [KEYCLOAK_CLIENT_ID]
    assert query["redirect_uri"] == [KEYCLOAK_REDIRECT_URI]
    assert query["response_type"] == ["code"]
    assert query["scope"] == ["openid profile email"]

    with httpx2.Client() as keycloak_client_session:
        login_page = keycloak_client_session.get(authorize_url, timeout=20)
        assert login_page.status_code == 200

        login_endpoint, query_parameters = _extract_keycloak_login_parameters(
            login_page.text,
            expected_action_prefix=f"{authorize_parts.scheme}://{authorize_parts.netloc}/realms/dev/login-actions/authenticate",
        )

        callback_response = keycloak_client_session.post(
            login_endpoint,
            params=query_parameters,
            data={"username": "admin", "password": "admin"},
            follow_redirects=False,
            timeout=20,
        )

    assert callback_response.status_code == 302
    callback_location = callback_response.headers.get("location")
    assert callback_location and callback_location.startswith(KEYCLOAK_REDIRECT_URI)

    callback_params = _parse_query(callback_location)
    final_response = keycloak_client.get(
        "/auth/oidc",
        params=callback_params,
        follow_redirects=False,
    )
    assert final_response.status_code == 307
    assert final_response.headers.get("location") == "/organizations"

    me_response = keycloak_client.get("/api/me")
    assert me_response.status_code == 200
    profile = me_response.json()
    assert profile["email"] == "example@longlink.dev"
    assert profile["role"] == "administrator"
