import pytest
from uuid import UUID
from src.kubernetes.resources import KubernetesResources
from src.kubernetes.applications import Applications, DesiredApplication

pytestmark = pytest.mark.no_db


def test_application_manifests_reference_separately_owned_secrets() -> None:
    """Render one Application's Secret inputs and reference-only workload resources."""

    # Define one desired Application with explicit user and runtime environment values.
    organization_id = UUID("10000000-0000-4000-8000-000000000001")
    application = DesiredApplication(
        id=UUID("20000000-0000-4000-8000-000000000001"),
        namespace="acme",
        image="ghcr.io/longlink/dashboard@sha256:" + "a" * 64,
    )
    renderer = Applications(KubernetesResources("unused"))

    # Render each Secret at its ownership boundary and the workload independently.
    environment_secret = renderer.environment_secret(
        application.id,
        application.namespace,
        {
            "PORT": "8000",
            "API_KEY": "secret",
        },
    )
    runtime_secret = renderer.runtime_secret(
        application.id,
        application.namespace,
        {
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
    manifests = renderer.manifests(application)

    # Verify user and Platform configuration remain in disjoint exact Secrets.
    assert environment_secret["kind"] == "Secret"
    assert environment_secret["metadata"]["name"] == f"{application.id}-environment"
    assert environment_secret["stringData"] == {
        "API_KEY": "secret",
        "PORT": "8000",
    }
    assert runtime_secret["kind"] == "Secret"
    assert runtime_secret["metadata"]["name"] == f"{application.id}-runtime"
    assert runtime_secret["stringData"] == {
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
    }
    assert "labels" not in environment_secret["metadata"]
    assert "annotations" not in environment_secret["metadata"]
    assert "labels" not in runtime_secret["metadata"]
    assert "annotations" not in runtime_secret["metadata"]
    assert manifests.deployment["kind"] == "Deployment"
    assert manifests.service["kind"] == "Service"
    assert "labels" not in manifests.deployment["metadata"]
    assert manifests.deployment["spec"]["selector"]["matchLabels"] == {"longlink.io/application-id": str(application.id)}
    assert manifests.deployment["spec"]["template"]["metadata"]["labels"] == {"longlink.io/application-id": str(application.id)}
    container = manifests.deployment["spec"]["template"]["spec"]["containers"][0]
    assert container["envFrom"] == [
        {"secretRef": {"name": f"{application.id}-environment"}},
        {"secretRef": {"name": f"{application.id}-runtime"}},
    ]
    assert "imagePullPolicy" not in container
    assert "ports" not in container
    assert "startupProbe" not in container
    assert container["readinessProbe"]["httpGet"] == {"path": "/health", "port": 8000}
    assert "strategy" not in manifests.deployment["spec"]
    assert "labels" not in manifests.service["metadata"]
    assert manifests.service["spec"]["selector"] == {"longlink.io/application-id": str(application.id)}
    assert "targetPort" not in manifests.service["spec"]["ports"][0]
    pod_security = manifests.deployment["spec"]["template"]["spec"]["securityContext"]
    assert "runAsNonRoot" not in pod_security
    assert "runAsUser" not in pod_security
    assert "runAsGroup" not in pod_security
    assert "fsGroup" not in pod_security
    assert "annotations" not in manifests.deployment["metadata"]
    assert "annotations" not in manifests.deployment["spec"]["template"]["metadata"]
    assert "annotations" not in manifests.service["metadata"]
    assert "database-secret" not in repr(manifests)
    assert "storage-secret" not in repr(manifests)
    assert "API_KEY" not in repr(manifests)
