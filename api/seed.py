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

# Credentials for the Keycloak user that owns the seeded resources.
# These match the dev realm user defined in dev/keycloak-realm-dev.json.
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"


def _seed_login() -> TestClient:
    """Authenticate against Keycloak via the API login endpoint.

    Returns an authenticated TestClient whose session cookie is preserved
    for all subsequent requests.
    """

    from main import app  # noqa: PLC0415  — late import avoids circular issues

    client = TestClient(app)

    r = client.post("/auth/login/password", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        raise RuntimeError(f"Login failed (HTTP {r.status_code}): {r.text}")

    return client


def main() -> None:
    """Seed the control plane database via the public HTTP API."""
    client = _seed_login()

    # ------------------------------------------------------------------
    # Location
    # ------------------------------------------------------------------
    locations = client.get("/api/locations").json()
    location = next((loc for loc in locations if loc["slug"] == "local"), None)
    if location is None:
        r = client.post("/api/locations", json={"name": "local", "slug": "local", "country": "CH"})
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
    databases = client.get("/api/database").json()
    if not any(db["name"] == "local" for db in databases):
        r = client.post(
            "/api/database",
            json={
                "kind": "postgre",
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
    storages = client.get("/api/storage").json()
    if not any(s["name"] == "local" for s in storages):
        r = client.post(
            "/api/storage",
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

    computes = client.get("/api/compute").json()
    if not any(c["ingress_host"] == "localhost:8443" for c in computes):
        r = client.post(
            "/api/compute",
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
    orgs = client.get("/api/orgs").json()
    organization = next((org for org in orgs if org["name"] == LOCAL_ORG), None)
    if organization is None:
        r = client.post(
            "/api/orgs",
            json={
                "name": LOCAL_ORG,
                "avatar": LOCAL_ORG_AVATAR,
                "location_id": location_id,
            },
        )
        if r.status_code == 409:
            orgs = client.get("/api/orgs").json()
            organization = next(org for org in orgs if org["name"] == LOCAL_ORG)
        else:
            r.raise_for_status()
            organization = r.json()

    # ------------------------------------------------------------------
    # Application
    # ------------------------------------------------------------------
    apps = client.get(f"/api/apps?organization_id={organization['id']}").json()
    if not any(a["name"] == LOCAL_APP["name"] for a in apps):
        r = client.post(
            f"/api/apps?organization_id={organization['id']}",
            json=LOCAL_APP,
        )
        if r.status_code == 409:
            pass  # already exists
        else:
            r.raise_for_status()


if __name__ == "__main__":
    main()
