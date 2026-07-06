import asyncio
import html
import re
import urllib.parse
from pathlib import Path
from uuid import UUID
import httpx2
from src.operations import provisioning
from src.environments import env
from fastapi.testclient import TestClient
from src.models.applications import ApplicationCreate
from src.database.services import users
from src.database.services import applications as application_service
from src.database.services import organizations as organization_service

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"
LOCAL_ADMIN_USERNAME = "admin"
LOCAL_ADMIN_PASSWORD = "admin"
OIDC_LOGIN_TIMEOUT_SECONDS = 20.0

LOCAL_APP = {
    "name": "sample",
    "image": env.LOCAL_APPLICATION_IMAGE,
    "description": "Local SDK development application",
    "icon": "Rocket",
    "envs": {"REQUIRED": "local-development"},
}
KUBECONFIG = Path(__file__).with_name("kubeconfig.yaml")


def parse_first_query_values(location: str) -> dict[str, str]:
    """Return first-value query parameters from a URL."""

    parsed_location = urllib.parse.urlsplit(location)
    return {key: values[0] for key, values in urllib.parse.parse_qs(parsed_location.query).items()}


def extract_keycloak_login_action(login_html: str) -> str:
    """Return the same-origin Keycloak login action URL from the login page."""

    form_match = re.search(
        r'<form[^>]+id="kc-form-login"[^>]*action="([^"]+)"[^>]*>',
        login_html,
        re.S,
    )
    if form_match is None:
        raise RuntimeError("Could not locate Keycloak login form")

    login_action = urllib.parse.urljoin(
        f"{env.OIDC_ISSUER.rstrip('/')}/",
        html.unescape(form_match.group(1)),
    )
    action_parts = urllib.parse.urlsplit(login_action)
    issuer_parts = urllib.parse.urlsplit(env.OIDC_ISSUER)

    # The local seed password must only be submitted back to the configured Keycloak issuer.
    if action_parts.scheme != issuer_parts.scheme or action_parts.netloc != issuer_parts.netloc:
        raise RuntimeError("Keycloak login form action does not match OIDC issuer")

    if "/login-actions/authenticate" not in action_parts.path:
        raise RuntimeError("Keycloak login form action is not an authentication endpoint")

    return login_action


def login_seed_administrator(client: TestClient) -> UUID:
    """Authenticate the seed client through the local Keycloak redirect flow."""

    authorize_response = client.get("/auth/login/oidc?next=/organizations", follow_redirects=False)
    if authorize_response.status_code not in {302, 303, 307}:
        raise RuntimeError(
            f"OIDC login start failed (HTTP {authorize_response.status_code}): {authorize_response.text}"
        )

    authorize_url = authorize_response.headers.get("location")
    if not authorize_url:
        raise RuntimeError("OIDC login start did not return a redirect URL")

    authorize_parts = urllib.parse.urlsplit(authorize_url)
    issuer_parts = urllib.parse.urlsplit(env.OIDC_ISSUER)
    if authorize_parts.scheme != issuer_parts.scheme or authorize_parts.netloc != issuer_parts.netloc:
        raise RuntimeError("OIDC login start redirected outside the configured issuer")

    with httpx2.Client(follow_redirects=False, timeout=OIDC_LOGIN_TIMEOUT_SECONDS) as identity_client:
        login_page = identity_client.get(authorize_url)
        login_page.raise_for_status()

        login_response = identity_client.post(
            extract_keycloak_login_action(login_page.text),
            data={"username": LOCAL_ADMIN_USERNAME, "password": LOCAL_ADMIN_PASSWORD},
        )

    if login_response.status_code not in {302, 303, 307}:
        raise RuntimeError(f"Keycloak login failed (HTTP {login_response.status_code}): {login_response.text}")

    callback_location = login_response.headers.get("location")
    if not callback_location or not callback_location.startswith(env.OIDC_REDIRECT_URI):
        raise RuntimeError("Keycloak login did not redirect back to the configured callback")

    callback_response = client.get(
        "/auth/oidc",
        params=parse_first_query_values(callback_location),
        follow_redirects=False,
    )
    if callback_response.status_code not in {302, 303, 307}:
        raise RuntimeError(
            f"OIDC callback failed (HTTP {callback_response.status_code}): {callback_response.text}"
        )

    profile_response = client.get("/api/me")
    profile_response.raise_for_status()
    return UUID(profile_response.json()["id"])


async def sync_local_application(application_id: UUID, organization_id: UUID, user_id: UUID) -> None:
    """Refresh the seeded local application runtime when it already exists."""

    user = await users.get_by_id(user_id)
    organization = await organization_service.get(organization_id)
    application = await application_service.get_by_id(application_id)
    if user is None or organization is None or application is None:
        raise RuntimeError("Seeded application could not be loaded for runtime sync")

    await provisioning.sync_application_runtime(
        application,
        organization,
        ApplicationCreate.model_validate(LOCAL_APP),
        user,
    )


def main() -> None:
    """Seed the control plane database via the public HTTP API."""
    from main import app  # noqa: PLC0415  — late import avoids circular issues

    client = TestClient(app)

    user_id = login_seed_administrator(client)

    # ------------------------------------------------------------------
    # Location
    # ------------------------------------------------------------------
    locations = client.get("/api/locations").json()
    location = next((loc for loc in locations if loc["slug"] == "local"), None)
    if location is None:
        r = client.post(
            "/api/locations",
            json={
                "name": "local",
                "slug": "local",
                "country": "CH",
                "provider": "local",
            },
        )
        if r.status_code == 409:
            locations = client.get("/api/locations").json()
            location = next(loc for loc in locations if loc["slug"] == "local")
        else:
            r.raise_for_status()
            location = r.json()

    location_id = location["id"]

    # ------------------------------------------------------------------
    # Database registry
    # ------------------------------------------------------------------
    databases = client.get("/api/databases").json()
    if not any(db["name"] == "local" for db in databases):
        r = client.post(
            "/api/databases",
            json={
                "kind": "postgresql",
                "name": "local",
                "host": "localhost",
                "port": 15432,
                "username": "admin",
                "password": "admin",
                "runtime_host": "host.k3d.internal",
                "runtime_port": 15432,
                "location_id": location_id,
            },
        )
        r.raise_for_status()

    # ------------------------------------------------------------------
    # Storage registry
    # ------------------------------------------------------------------
    storages = client.get("/api/storages").json()
    if not any(s["name"] == "local" for s in storages):
        r = client.post(
            "/api/storages",
            json={
                "kind": "s3",
                "name": "local",
                "protocol": "http",
                "endpoint_url": "http://localhost:19000",
                "runtime_endpoint_url": "http://host.k3d.internal:19000",
                "access_key_id": "admin",
                "secret_access_key": "adminadmin",
                "location_id": location_id,
            },
        )
        r.raise_for_status()

    # ------------------------------------------------------------------
    # Compute registry
    # ------------------------------------------------------------------
    kubeconfig = KUBECONFIG.read_text(encoding="utf-8")

    computes = client.get("/api/computes").json()
    if not any(c["ingress_host"] == "localhost:8443" for c in computes):
        r = client.post(
            "/api/computes",
            json={
                "kind": "kubernetes",
                "name": "local",
                "kubeconfig": kubeconfig,
                "ingress_host": "localhost:8443",
                "location_id": location_id,
            },
        )
        r.raise_for_status()

    # ------------------------------------------------------------------
    # Organization
    # ------------------------------------------------------------------
    organizations = client.get("/api/organizations").json()
    organization = next(
        (organization for organization in organizations if organization["name"] == LOCAL_ORG),
        None,
    )
    if organization is None:
        r = client.post(
            "/api/organizations",
            json={
                "name": LOCAL_ORG,
                "avatar": LOCAL_ORG_AVATAR,
                "location_id": location_id,
            },
        )
        if r.status_code == 409:
            organizations = client.get("/api/organizations").json()
            organization = next(organization for organization in organizations if organization["name"] == LOCAL_ORG)
        else:
            r.raise_for_status()
            organization = r.json()

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------
    applications = client.get(f"/api/organizations/{organization['id']}/applications").json()
    application = next(
        (application for application in applications if application["name"] == LOCAL_APP["name"]),
        None,
    )
    if application is None:
        r = client.post(
            f"/api/organizations/{organization['id']}/applications",
            json=LOCAL_APP,
        )
        if r.status_code == 409:
            applications = client.get(f"/api/organizations/{organization['id']}/applications").json()
            application = next(application for application in applications if application["name"] == LOCAL_APP["name"])
        else:
            r.raise_for_status()
            application = None

    if application is not None:
        asyncio.run(sync_local_application(UUID(application["id"]), UUID(organization["id"]), user_id))


if __name__ == "__main__":
    main()
