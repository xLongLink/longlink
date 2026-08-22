from httpx2 import AsyncClient
from factories import create_compute, claim_operation, queue_operation, complete_operation


async def test_compute_registry_create_duplicate_and_blocks_deletion_while_lifecycle_is_pending(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Create one Compute registry, reject a duplicate, and retain its pending lifecycle target."""

    client = clients[0]

    create_response = await client.post(
        "/api/v1/computes",
        json={"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )
    duplicate_response = await client.post(
        "/api/v1/computes",
        json={"name": "Ephemeral Compute", "kubeconfig": "apiVersion: v1\nclusters: []\n"},
    )
    created = create_response.json()
    registry_id = created["id"]
    delete_response = await client.delete(f"/api/v1/computes/{registry_id}")
    get_response = await client.get(f"/api/v1/computes/{registry_id}")

    assert create_response.status_code == 202
    assert created["name"] == "Ephemeral Compute"
    assert created["gateway_url"] is None
    assert "kubeconfig" not in created
    assert duplicate_response.status_code == 409
    assert duplicate_response.json() == {"detail": "Compute registry already exists"}
    assert delete_response.status_code == 409
    assert delete_response.json() == {"detail": "Compute registry has unfinished lifecycle operation"}
    assert get_response.status_code == 200


async def test_compute_registry_deletes_unused_registration(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove an unused Compute registration with no lifecycle Operation."""

    client = clients[0]
    compute = await create_compute()

    delete_response = await client.delete(f"/api/v1/computes/{compute.id}")
    retry_response = await client.delete(f"/api/v1/computes/{compute.id}")

    assert delete_response.status_code == 204
    assert retry_response.status_code == 404


async def test_compute_registry_deletes_registration_after_completed_lifecycle(
    clients: tuple[AsyncClient, AsyncClient, AsyncClient],
) -> None:
    """Remove a Compute registration after its lifecycle Operation completes."""

    client = clients[0]
    compute = await create_compute()
    await queue_operation(target_id=compute.id)
    claimed = await claim_operation()
    assert claimed is not None
    await complete_operation(claimed.id)

    response = await client.delete(f"/api/v1/computes/{compute.id}")

    assert response.status_code == 204
