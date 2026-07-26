import pytest
from uuid import UUID
from src.models.types import DatabaseSSLMode
from src.adapters.postgres import DatabaseRuntimeConnection
from src.kubernetes.resources import KubernetesResources
from src.adapters.storage.base import StorageRuntimeCredentials
from src.kubernetes.applications import Applications, DesiredApplication

pytestmark = pytest.mark.no_db


def test_application_manifests_include_labels_annotations_and_secret_envs() -> None:
    """Render one application's workload resources without a cluster connection."""

    # Arrange
    application = DesiredApplication(
        id=UUID("20000000-0000-4000-8000-000000000001"),
        organization_id=UUID("10000000-0000-4000-8000-000000000001"),
        namespace="acme",
        image="ghcr.io/longlink/dashboard@sha256:" + "a" * 64,
    )
    connection = DatabaseRuntimeConnection(
        host="database.internal",
        port=5432,
        password="database-secret",
        sslmode=DatabaseSSLMode.require,
        username="application-user",
        database_name="organization-database",
    )
    storage_credentials = StorageRuntimeCredentials(access_key_id="storage-user", secret_access_key="storage-secret")
    renderer = Applications(KubernetesResources("unused"))

    # Act
    manifests = renderer.manifests(
        application,
        "compute-id",
        "revision-secret",
        envs={"PORT": "8000", "API_KEY": "secret"},
        connection=connection,
        storage_endpoint_url="https://sos-ch-gva-2.exo.io",
        storage_credentials=storage_credentials,
    )

    # Assert
    labels = manifests.secret["metadata"]["labels"]
    annotations = manifests.secret["metadata"]["annotations"]
    assert manifests.secret["kind"] == "Secret"
    assert manifests.secret["metadata"]["name"] == str(application.id)
    assert manifests.secret["stringData"] == {
        "API_KEY": "secret",
        "LONGLINK_DATABASE_HOST": "database.internal",
        "LONGLINK_DATABASE_NAME": "organization-database",
        "LONGLINK_DATABASE_PASSWORD": "database-secret",
        "LONGLINK_DATABASE_PORT": "5432",
        "LONGLINK_DATABASE_SCHEMA": application.id.hex,
        "LONGLINK_DATABASE_SSLMODE": "require",
        "LONGLINK_DATABASE_USERNAME": "application-user",
        "LONGLINK_ENV": "production",
        "LONGLINK_STORAGE_BUCKET": application.organization_id.hex,
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://sos-ch-gva-2.exo.io",
        "LONGLINK_STORAGE_PASSWORD": "storage-secret",
        "LONGLINK_STORAGE_PREFIX": f"applications/{application.id.hex}/",
        "LONGLINK_STORAGE_REGION": "ch-gva-2",
        "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
        "LONGLINK_STORAGE_USERNAME": "storage-user",
        "PORT": "8000",
    }
    assert labels["longlink.io/application-id"] == str(application.id)
    assert labels["longlink.io/organization-id"] == str(application.organization_id)
    assert labels["longlink.io/resource-scope"] == "application"
    assert set(annotations) == {"longlink.io/runtime-revision"}
    assert manifests.deployment["kind"] == "Deployment"
    assert manifests.service["kind"] == "Service"
    assert "longlink.io/platform-version" not in manifests.deployment["metadata"]["annotations"]
    assert "longlink.io/platform-version" not in manifests.service["metadata"]["annotations"]
    assert "database-secret" not in repr(manifests)
