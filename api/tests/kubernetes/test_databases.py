import pytest
from uuid import uuid4
from conftest import kubernetes_client
from src.kubernetes import databases
from src.kubernetes.client import Kubernetes

pytestmark = pytest.mark.no_db


async def test_database_certificate_reads_cnpg_ca_in_database_namespace(monkeypatch: pytest.MonkeyPatch) -> None:
    """Do not use a gateway certificate or a different tenant's database CA."""

    # Arrange
    organization = uuid4()
    observed: list[tuple[str, str, str]] = []

    async def certificate(_client: Kubernetes, namespace: str, name: str, *, entry: str) -> str:
        """Capture the external trust lookup coordinates."""

        observed.append((namespace, name, entry))
        return "database-ca-pem"

    monkeypatch.setattr(databases.tls, "certificate", certificate)

    # Act
    result = await databases.certificate(kubernetes_client(), organization)

    # Assert
    assert result == "database-ca-pem"
    assert observed == [(f"longlink-database-{organization.hex}", "database-ca", "ca.crt")]
