import asyncio
from uuid import UUID
from pathlib import Path
from src.operations import provisioning
from src.environments import env
from fastapi.testclient import TestClient
from src.models.applications import ApplicationCreate
from src.database.services.users import users
from src.database.services.applications import \
    applications as application_service
from src.database.services.organizations import \
    organizations as organization_service

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"

LOCAL_APP = {
    "name": "sample",
    "image": env.LOCAL_APPLICATION_IMAGE,
    "description": "Local SDK development application",
    "icon": "Rocket",
    "envs": {"REQUIRED": "local-development"},
}
KUBECONFIG = Path(__file__).with_name("kubeconfig.yaml")


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

    response = client.post("/auth/login/password", json={"username": "admin", "password": "admin"})
    if response.status_code not in {200, 204}:
        raise RuntimeError(f"Login failed (HTTP {response.status_code}): {response.text}")

    profile_response = client.get("/api/me")
    profile_response.raise_for_status()
    user_id = UUID(profile_response.json()["id"])

    # ------------------------------------------------------------------
    # Location
    # ------------------------------------------------------------------
    locations = client.get("/api/locations").json()
    location = next((loc for loc in locations if loc["slug"] == "local"), None)
    if location is None:
        r = client.post("/api/locations", json={"name": "local", "slug": "local", "country": "CH", "provider": "local"})
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
    organization = next((organization for organization in organizations if organization["name"] == LOCAL_ORG), None)
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
    application = next((application for application in applications if application["name"] == LOCAL_APP["name"]), None)
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
