from pathlib import Path
from fastapi.testclient import TestClient

LOCAL_ORG = "test"
LOCAL_ORG_AVATAR = "https://example.com/organizations/test.png"

LOCAL_APP = {
    "name": "sample",
    "image": "ghcr.io/xlonglink/sample:latest",
    "description": "Sample application",
    "icon": "Rocket",
}


def main() -> None:
    """Seed the control plane database via the public HTTP API."""
    from main import app  # noqa: PLC0415  — late import avoids circular issues

    client = TestClient(app)

    response = client.post("/auth/login/password", json={"username": "admin", "password": "admin"})
    if response.status_code not in {200, 204}:
        raise RuntimeError(f"Login failed (HTTP {response.status_code}): {response.text}")

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
                "access_key_id": "admin",
                "secret_access_key": "admin",
                "location_id": location_id,
            },
        )
        r.raise_for_status()

    # ------------------------------------------------------------------
    # Compute registry
    # ------------------------------------------------------------------
    kubeconfig = Path(__file__).with_name("kubeconfig.yaml").read_text(encoding="utf-8")

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
    if not any(application["name"] == LOCAL_APP["name"] for application in applications):
        r = client.post(
            f"/api/applications?organization_id={organization['id']}",
            json=LOCAL_APP,
        )
        if r.status_code == 409:
            pass  # already exists
        else:
            r.raise_for_status()


if __name__ == "__main__":
    main()
