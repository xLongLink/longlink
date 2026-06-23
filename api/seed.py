import asyncio
from pathlib import Path
from uuid import UUID
from fastapi import HTTPException, status
from fastapi.testclient import TestClient
from src.models.compute import ComputeKind
from src.models.storage import StorageKind
from src.models.database import DatabaseKind
from main import app
from src.database.services.users import users
from src.database.services.compute import compute
from src.database.services.storage import storage
from src.database.services.database import database

LOCAL_DATABASE = {
    "kind": DatabaseKind.postgre,
    "name": "local",
    "host": "localhost",
    "port": 15432,
    "username": "admin",
    "password": "admin",
}

LOCAL_STORAGE = {
    "kind": StorageKind.s3,
    "name": "local",
    "protocol": "http",
    "endpoint_url": "http://localhost:19000",
    "access_key_id": "admin",
    "secret_access_key": "admin",
}

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"

LOCAL_APP = {
    "name": "sample",
    "image": "ghcr.io/xlonglink/sample:latest",
    "description": "Sample application",
    "icon": "Rocket",
}

LOCAL_COMPUTE = {
    "kind": ComputeKind.kubernetes,
    "kubeconfig": Path(__file__).with_name("kubeconfig.yaml").read_text(encoding="utf-8"),
    "ingress_host": "localhost:8443",
}


async def main() -> None:
    """Seed the control plane database with baseline records."""

    # Log in through the real password flow so the seed exercises the UI path.
    with TestClient(app) as client:
        login_response = None
        for _ in range(30):
            try:
                login_response = client.post(
                    "/auth/login/password",
                    json={"username": "admin", "password": "admin"},
                )
            except Exception:
                login_response = None

            if login_response is not None and login_response.status_code == status.HTTP_200_OK:
                break

            await asyncio.sleep(1)

        if login_response is None or login_response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to authenticate seed admin")

        profile_response = client.get("/api/me")
        if profile_response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to read seed admin profile")

        profile = profile_response.json()
        seed_user = await users.get(profile["oidc"])
        if seed_user is None:
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Seed admin user missing")

        # Reuse existing seed records when the bootstrap script is run again.
        location_response = client.get("/api/locations")
        if location_response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to list seed locations")

        location_payload = next((item for item in location_response.json() if item["slug"] == "local"), None)
        if location_payload is None:
            location_response = client.post(
                "/api/locations",
                json={"name": "Local development", "slug": "local", "country": "CH"},
            )
            if location_response.status_code != status.HTTP_200_OK:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create seed location")
            location_payload = location_response.json()

        location_id = UUID(location_payload["id"])

        organization_response = client.get("/api/orgs")
        if organization_response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to list seed organizations")

        organization_payload = next((item for item in organization_response.json() if item["name"] == LOCAL_ORG), None)
        if organization_payload is None:
            organization_response = client.post(
                "/api/orgs",
                json={"name": LOCAL_ORG, "avatar": LOCAL_ORG_AVATAR, "location_id": location_payload["id"]},
            )
            if organization_response.status_code != status.HTTP_200_OK:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create seed organization")
            organization_payload = organization_response.json()

        # Keep the local backend registrations available after every seed run.
        await database.create(**LOCAL_DATABASE, location_id=location_id, user=seed_user)
        await storage.create(**LOCAL_STORAGE, location_id=location_id, user=seed_user)
        compute_response = client.get("/api/compute")
        if compute_response.status_code != status.HTTP_200_OK:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to list seed compute registries")

        if next((item for item in compute_response.json() if item["ingress_host"] == LOCAL_COMPUTE["ingress_host"]), None) is None:
            await compute.create(**LOCAL_COMPUTE, location_id=location_id, user=seed_user)

        organization_id = organization_payload["id"]
        app_response = client.post(
            f"/api/apps?organization_id={organization_id}",
            json={
                "name": LOCAL_APP["name"],
                "image": LOCAL_APP["image"],
                "description": LOCAL_APP["description"],
                "icon": LOCAL_APP["icon"],
                "envs": {
                    "REQUIRED": "required",
                    "OPTIONAL": "optional",
                },
            },
        )
        if app_response.status_code != status.HTTP_200_OK:
            apps_response = client.get(f"/api/apps?organization_id={organization_id}")
            if apps_response.status_code != status.HTTP_200_OK:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to list seed applications")

            if next((item for item in apps_response.json() if item["name"] == LOCAL_APP["name"]), None) is None:
                raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to create seed application")


if __name__ == "__main__":
    asyncio.run(main())
