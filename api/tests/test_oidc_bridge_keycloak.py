import os
import sys
import uuid
import httpx
import pytest
import socket
import asyncio
import importlib
from httpx import ASGITransport
from pathlib import Path
from docker.errors import DockerException
from testcontainers.core.container import DockerContainer

KEYCLOAK_IMAGE = "quay.io/keycloak/keycloak:26.2"
KEYCLOAK_INTERNAL_PORT = 8080


def _pick_free_port() -> int:
    """Return an available host TCP port for temporary container binding."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.bind(("127.0.0.1", 0))
        sock.listen(1)
        return int(sock.getsockname()[1])


async def _wait_for_keycloak_ready(base_url: str) -> None:
    """Poll Keycloak until master realm endpoint responds successfully."""
    timeout_s = 90.0

    # Poll master realm endpoint until Keycloak fully boots.
    async with httpx.AsyncClient(timeout=5.0) as client:
        for _ in range(int(timeout_s)):
            try:
                response = await client.get(f"{base_url}/realms/master")
                if response.status_code == 200:
                    return
            except httpx.HTTPError:
                pass

            await asyncio.sleep(1)

    raise RuntimeError("Keycloak container did not become ready in time")


async def _admin_token(client: httpx.AsyncClient, base_url: str) -> str:
    """Fetch admin access token from Keycloak master realm."""
    response = await client.post(
        f"{base_url}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": "admin",
            "password": "admin",
        },
    )
    response.raise_for_status()
    return response.json()["access_token"]


async def _setup_realm(
    client: httpx.AsyncClient,
    base_url: str,
    realm: str,
    client_id: str,
    client_secret: str,
) -> None:
    """Create realm and OIDC client used by API integration flow."""
    token = await _admin_token(client, base_url)
    headers = {"Authorization": f"Bearer {token}"}

    realm_response = await client.post(
        f"{base_url}/admin/realms",
        headers=headers,
        json={"realm": realm, "enabled": True},
    )
    if realm_response.status_code not in (201, 409):
        realm_response.raise_for_status()

    client_payload = {
        "clientId": client_id,
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": False,
        "secret": client_secret,
        "standardFlowEnabled": True,
        "directAccessGrantsEnabled": True,
        "redirectUris": [
            "http://localhost:8000/auth/oidc",
            "http://testserver/auth/oidc",
        ],
        "webOrigins": ["*"],
    }
    client_response = await client.post(
        f"{base_url}/admin/realms/{realm}/clients",
        headers=headers,
        json=client_payload,
    )
    if client_response.status_code not in (201, 409):
        client_response.raise_for_status()


def _load_app_with_oidc(db_path: Path, issuer: str, client_id: str, client_secret: str):
    """Reload FastAPI app module with OIDC config values for integration test."""
    os.environ["DEV"] = "true"
    os.environ["ENV_DATABASE_URL"] = f"sqlite+aiosqlite:///{db_path}"
    os.environ["ENV_OIDC_ISSUER"] = issuer
    os.environ["ENV_OIDC_CLIENT_ID"] = client_id
    os.environ["ENV_OIDC_CLIENT_SECRET"] = client_secret
    os.environ["ENV_OIDC_REDIRECT_URI"] = "http://testserver/auth/oidc"

    # Reset cached modules so env reads happen with test-specific values.
    for module_name in ("main", "src.auth", "src.env", "src.routes.auth"):
        if module_name in sys.modules:
            del sys.modules[module_name]

    module = importlib.import_module("main")
    return module.app


@pytest.fixture()
async def keycloak_base_url() -> str:
    """Start disposable Keycloak with testcontainers and return reachable base URL."""
    host_port = _pick_free_port()

    try:
        with (
            DockerContainer(KEYCLOAK_IMAGE)
            .with_exposed_ports(KEYCLOAK_INTERNAL_PORT)
            .with_env("KEYCLOAK_ADMIN", "admin")
            .with_env("KEYCLOAK_ADMIN_PASSWORD", "admin")
            .with_command("start-dev --http-port=8080")
            .with_bind_ports(KEYCLOAK_INTERNAL_PORT, host_port)
        ) as _container:
            base_url = f"http://127.0.0.1:{host_port}"
            await _wait_for_keycloak_ready(base_url)
            yield base_url
    except DockerException as exc:  # pragma: no cover - depends on host docker availability
        pytest.skip(f"Docker unavailable for testcontainers Keycloak: {exc}")


@pytest.mark.integration
async def test_pure_oidc_bridge_with_dedicated_control_plane_realm(
    tmp_path: Path, keycloak_base_url: str
) -> None:
    """Validate OIDC login bridge flow against disposable Keycloak realm."""
    realm = f"longlink-control-plane-{uuid.uuid4().hex[:8]}"
    client_id = "longlink-api"
    client_secret = "longlink-secret"

    async with httpx.AsyncClient(timeout=10.0) as keycloak_client:
        await _setup_realm(
            keycloak_client,
            keycloak_base_url,
            realm,
            client_id,
            client_secret,
        )

    issuer = f"{keycloak_base_url}/realms/{realm}"
    app = _load_app_with_oidc(tmp_path / "oidc.db", issuer, client_id, client_secret)

    async with httpx.AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as client:
        methods = await client.get("/login")
        assert methods.status_code == 200
        assert methods.json() == ["oidc"]

        login_redirect = await client.get("/login/oidc", follow_redirects=False)
        assert login_redirect.status_code in (302, 307)
        redirect_location = login_redirect.headers["location"]
        assert f"/realms/{realm}/protocol/openid-connect/auth" in redirect_location
        assert f"client_id={client_id}" in redirect_location
