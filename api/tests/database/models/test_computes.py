from factories import create_compute
from sqlalchemy import text
from src.database.session import session_scope
from src.database.models.computes import ComputeRegistry


async def test_compute_credentials_are_encrypted_at_rest() -> None:
    """Keep cluster and storage credentials out of raw database records."""

    # Arrange
    compute = await create_compute()

    # Act
    async with session_scope() as session:
        raw = await session.execute(text("SELECT kubeconfig, storage_secret_key FROM compute_registries"))
        kubeconfig, secret = raw.one()
        restored = await session.get(ComputeRegistry, compute.id)

    # Assert
    assert "apiVersion" not in kubeconfig
    assert "controller-secret" not in secret
    assert restored is not None
    assert restored.kubeconfig == compute.kubeconfig
    assert restored.storage_secret_key == "controller-secret"  # noqa: S105
