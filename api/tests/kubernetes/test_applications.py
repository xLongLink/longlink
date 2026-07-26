import pytest
from uuid import UUID
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications, DesiredApplication

pytestmark = pytest.mark.no_db


def test_application_manifests_include_labels_and_secret_envs() -> None:
    """Render one application's workload resources without a cluster connection."""

    # Arrange
    organization_id = UUID("10000000-0000-4000-8000-000000000001")
    application = DesiredApplication(
        id=UUID("20000000-0000-4000-8000-000000000001"),
        namespace="acme",
        image="ghcr.io/longlink/dashboard@sha256:" + "a" * 64,
    )
    renderer = Applications(KubernetesResources("unused"))

    # Act
    manifests = renderer.manifests(
        application,
        envs={
            "PORT": "8000",
            "API_KEY": "secret",
            "LONGLINK_ENV": "production",
            "LONGLINK_DATABASE_HOST": "database.internal",
            "LONGLINK_DATABASE_NAME": "organization-database",
            "LONGLINK_DATABASE_PASSWORD": "database-secret",
            "LONGLINK_DATABASE_PORT": "5432",
            "LONGLINK_DATABASE_SCHEMA": application.id.hex,
            "LONGLINK_DATABASE_SSLMODE": "require",
            "LONGLINK_DATABASE_USERNAME": "application-user",
            "LONGLINK_STORAGE_BUCKET": organization_id.hex,
            "LONGLINK_STORAGE_ENDPOINT_URL": "https://sos-ch-gva-2.exo.io",
            "LONGLINK_STORAGE_PASSWORD": "storage-secret",
            "LONGLINK_STORAGE_PREFIX": f"applications/{application.id.hex}/",
            "LONGLINK_STORAGE_REGION": "ch-gva-2",
            "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
            "LONGLINK_STORAGE_USERNAME": "storage-user",
        },
    )

    # Assert
    labels = manifests.secret["metadata"]["labels"]
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
        "LONGLINK_STORAGE_BUCKET": organization_id.hex,
        "LONGLINK_STORAGE_ENDPOINT_URL": "https://sos-ch-gva-2.exo.io",
        "LONGLINK_STORAGE_PASSWORD": "storage-secret",
        "LONGLINK_STORAGE_PREFIX": f"applications/{application.id.hex}/",
        "LONGLINK_STORAGE_REGION": "ch-gva-2",
        "LONGLINK_STORAGE_SHARED_PREFIX": "shared/",
        "LONGLINK_STORAGE_USERNAME": "storage-user",
        "PORT": "8000",
    }
    assert labels == {"longlink.io/application-id": str(application.id)}
    assert "annotations" not in manifests.secret["metadata"]
    assert manifests.deployment["kind"] == "Deployment"
    assert manifests.service["kind"] == "Service"
    assert "labels" not in manifests.deployment["metadata"]
    assert manifests.deployment["spec"]["selector"]["matchLabels"] == {"longlink.io/application-id": str(application.id)}
    assert manifests.deployment["spec"]["template"]["metadata"]["labels"] == {"longlink.io/application-id": str(application.id)}
    container = manifests.deployment["spec"]["template"]["spec"]["containers"][0]
    assert "imagePullPolicy" not in container
    assert container["startupProbe"]["httpGet"] == container["readinessProbe"]["httpGet"]
    assert "labels" not in manifests.service["metadata"]
    assert manifests.service["spec"]["selector"] == {"longlink.io/application-id": str(application.id)}
    assert "annotations" not in manifests.deployment["metadata"]
    assert "annotations" not in manifests.deployment["spec"]["template"]["metadata"]
    assert "annotations" not in manifests.service["metadata"]
    assert "database-secret" not in repr(manifests)
