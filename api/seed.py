import asyncio
from pathlib import Path
from src.models.countries import Country
from src.models.compute import ComputeKind
from src.models.storage import StorageKind
from src.models.database import DatabaseKind
from src.database.services.applications import applications
from src.database.services.compute import compute
from src.database.services.database import database
from src.database.services.locations import locations
from src.database.services.organizations import organizations
from src.database.services.storage import storage
from src.database.services.users import users
from src.utils.utils import slugify

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

    # Reuse one seed identity so the script stays idempotent across runs.
    seed_user = await users.upsert(
        oidc="seed-admin",
        email="example@longlink.dev",
        name="Admin",
        avatar=None,
    )

    # Reuse the bootstrap location when the seed is run again.
    location = next((item for item in await locations.list() if item.slug == "local"), None)
    if location is None:
        location = await locations.create("local", "Local development", seed_user, country=Country.CH)

    # Keep the local backend registrations available after every seed run.
    await database.create(**LOCAL_DATABASE, location_id=location.id, user=seed_user)
    await storage.create(**LOCAL_STORAGE, location_id=location.id, user=seed_user)

    compute_list = await compute.list()
    if next((item for item in compute_list if item.ingress_host == LOCAL_COMPUTE["ingress_host"]), None) is None:
        await compute.create(**LOCAL_COMPUTE, location_id=location.id, user=seed_user)

    # Reuse the demo organization and sample app when they already exist.
    organization = next((item for item in await organizations.list() if item.name == LOCAL_ORG), None)
    if organization is None:
        organization = await organizations.create(LOCAL_ORG, location.id, seed_user, avatar=LOCAL_ORG_AVATAR)

    app_list = await applications.list_by_organization(organization.id)
    if next((item for item in app_list if item.name == LOCAL_APP["name"]), None) is None:
        await applications.create(
            organization.id,
            name=LOCAL_APP["name"],
            slug=slugify(LOCAL_APP["name"]),
            image=LOCAL_APP["image"],
            user=seed_user,
            description=LOCAL_APP["description"],
            icon=LOCAL_APP["icon"],
        )


if __name__ == "__main__":
    asyncio.run(main())
