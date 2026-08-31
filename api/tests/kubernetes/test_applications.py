import pytest
from uuid import UUID
from conftest import FakeKubernetes
from src.utils import templates
from src.kubernetes import applications
from collections.abc import AsyncIterator
from importlib.resources import files

pytestmark = pytest.mark.no_db


def test_application_template_limits_ephemeral_storage() -> None:
    """Bound each Application and migration temporary filesystem."""

    # Arrange
    migration, deployment, _, _ = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("application", "application.yml"),
        application_id="application",
        application_id_label="longlink.io/application-id",
        image='"ghcr.io/longlink/dashboard:latest"',
        namespace="acme",
        runtime_revision="revision",
        migration_id="application-migration",
    )

    # Assert
    for workload in (migration, deployment):
        workload_spec = workload["spec"]
        assert isinstance(workload_spec, dict)
        pod_template = workload_spec["template"]
        assert isinstance(pod_template, dict)
        pod_spec = pod_template["spec"]
        assert isinstance(pod_spec, dict)
        containers = pod_spec["containers"]
        assert isinstance(containers, list) and len(containers) == 1
        container = containers[0]
        assert isinstance(container, dict)
        resources = container["resources"]
        assert isinstance(resources, dict)
        requests = resources["requests"]
        assert isinstance(requests, dict)
        limits = resources["limits"]
        assert isinstance(limits, dict)

        assert requests["ephemeral-storage"] == "256Mi"
        assert limits["ephemeral-storage"] == "512Mi"
        assert container["volumeMounts"] == [{"name": "tmp", "mountPath": "/tmp"}]
        assert pod_spec["volumes"] == [{"name": "tmp", "emptyDir": {"sizeLimit": "256Mi"}}]


async def test_application_apply_stops_after_failed_migration_job(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid creating runtime resources when the Application migration fails."""

    # Arrange
    applied: list[str] = []
    logged: list[str] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the resource manifest for apply assertions."""

            self.raw = raw

    class MigrationJob(Resource):
        """Report a terminally failed migration Job."""

        async def wait(self, conditions: list[str]) -> None:
            """Accept the migration terminal conditions."""

            assert conditions == ["condition=Complete", "condition=Failed"]
            self.raw["status"] = {"failed": 1}

    class MigrationPod:
        """Expose output from the failed migration Job."""

        metadata = {"name": "failed-migration-pod"}

        @classmethod
        async def list(cls, **kwargs: object) -> AsyncIterator["MigrationPod"]:
            """Yield the failed migration Pod selected by its Job label."""

            assert kwargs["namespace"] == "acme"
            assert kwargs["label_selector"] == {
                applications.APPLICATION_ID_LABEL: "00000000-0000-4000-8000-000000000001",
                "job-name": "00000000-0000-4000-8000-000000000001-migration-5d5aa840",
            }
            yield cls()

        async def logs(self, tail_lines: int) -> AsyncIterator[str]:
            """Yield recent migration output."""

            assert tail_lines == 200
            yield "database connection refused"

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    def log_error(message: str, *args: object) -> None:
        """Capture formatted operation error output."""

        logged.append(message % args)

    monkeypatch.setattr(
        applications.templates,
        "readyml_list",
        lambda *_args, **_kwargs: (
            {"kind": "Job"},
            {"kind": "Deployment"},
            {"kind": "Service"},
            {"kind": "HTTPRoute"},
        ),
    )
    monkeypatch.setattr(applications, "Secret", Resource)
    monkeypatch.setattr(applications, "Job", MigrationJob)
    monkeypatch.setattr(applications, "Pod", MigrationPod)
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "apply", apply)
    monkeypatch.setattr(applications.logger, "error", log_error)

    # Act and assert
    with pytest.raises(RuntimeError, match="Application migration Job .* failed"):
        await applications.Applications(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
        )
    assert applied == ["Secret", "Job"]
    assert logged[-2:] == [
        "Recent output from failed migration Pod failed-migration-pod:",
        "Migration Pod failed-migration-pod: database connection refused",
    ]


async def test_application_apply_waits_for_deployment_and_route_readiness(monkeypatch: pytest.MonkeyPatch) -> None:
    """Apply every workload resource when the Deployment and HTTPRoute are ready."""

    # Arrange
    applied: list[str] = []

    class Resource:
        """Represent a ready Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Expose the resource fields queried during rollout."""

            self.raw = raw
            self.metadata = raw.get("metadata", {})
            self.spec = raw.get("spec", {})

        async def exists(self) -> bool:
            """Keep the resource present during rollout."""

            return True

        async def refresh(self) -> None:
            """Keep the ready resource state unchanged."""

    class MigrationJob(Resource):
        """Report a completed migration Job."""

        async def wait(self, conditions: list[str]) -> None:
            """Accept the migration terminal conditions."""

            assert conditions == ["condition=Complete", "condition=Failed"]

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    monkeypatch.setattr(
        applications.templates,
        "readyml_list",
        lambda *_args, **_kwargs: (
            {"kind": "Job"},
            {
                "kind": "Deployment",
                "metadata": {"generation": 1},
                "spec": {"replicas": 1},
                "status": {
                    "observedGeneration": 1,
                    "replicas": 1,
                    "updatedReplicas": 1,
                    "readyReplicas": 1,
                    "availableReplicas": 1,
                },
            },
            {"kind": "Service"},
            {
                "kind": "HTTPRoute",
                "status": {
                    "parents": [
                        {
                            "conditions": [
                                {"type": "Accepted", "status": "True"},
                                {"type": "ResolvedRefs", "status": "True"},
                            ]
                        }
                    ]
                },
            },
        ),
    )
    monkeypatch.setattr(applications, "Secret", Resource)
    monkeypatch.setattr(applications, "Job", MigrationJob)
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "apply", apply)

    # Act
    await applications.Applications(FakeKubernetes()).apply(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
        "ghcr.io/longlink/dashboard:latest",
        {},
    )

    # Assert
    assert applied == ["Secret", "Job", "Service", "HTTPRoute", "Deployment"]


async def test_application_apply_reports_quota_admission_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop rollout polling when Kubernetes rejects Pods for exceeding quota."""

    # Arrange
    applied: list[str] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Expose the resource fields queried during rollout."""

            self.raw = raw
            self.metadata = raw.get("metadata", {})
            self.spec = raw.get("spec", {})

        async def exists(self) -> bool:
            """Keep the Deployment present during rollout."""

            return True

        async def refresh(self) -> None:
            """Keep the quota-failure state unchanged."""

    class MigrationJob(Resource):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before the rollout failure."""

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    monkeypatch.setattr(
        applications.templates,
        "readyml_list",
        lambda *_args, **_kwargs: (
            {"kind": "Job"},
            {
                "kind": "Deployment",
                "status": {
                    "conditions": [
                        {
                            "type": "ReplicaFailure",
                            "reason": "FailedCreate",
                            "message": "exceeded quota: application Pods",
                        }
                    ]
                },
            },
            {"kind": "Service"},
            {"kind": "HTTPRoute"},
        ),
    )
    monkeypatch.setattr(applications, "Secret", Resource)
    monkeypatch.setattr(applications, "Job", MigrationJob)
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes Application capacity exhausted"):
        await applications.Applications(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
        )
    assert applied == ["Secret", "Job", "Service", "HTTPRoute", "Deployment"]


async def test_application_apply_reports_disappeared_deployment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop rollout polling when the Application Deployment disappears."""

    # Arrange
    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the resource manifest."""

            self.raw = raw

        async def exists(self) -> bool:
            """Report that the Deployment disappeared before rollout completed."""

            return False

        async def refresh(self) -> None:
            """Reject refreshes after the missing Deployment check."""

            raise AssertionError("A missing Deployment must not be refreshed")

    class MigrationJob(Resource):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before rollout polling."""

    async def apply(_resource: Resource) -> None:
        """Accept a resource without contacting Kubernetes."""

    monkeypatch.setattr(
        applications.templates,
        "readyml_list",
        lambda *_args, **_kwargs: ({"kind": "Job"}, {"kind": "Deployment"}, {"kind": "Service"}, {"kind": "HTTPRoute"}),
    )
    monkeypatch.setattr(applications, "Secret", Resource)
    monkeypatch.setattr(applications, "Job", MigrationJob)
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes Application Deployment disappeared during rollout"):
        await applications.Applications(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme", "ghcr.io/longlink/dashboard:latest", {}
        )


async def test_application_apply_waits_for_deployment_readiness(monkeypatch: pytest.MonkeyPatch) -> None:
    """Retry rollout polling until the Deployment becomes ready."""

    # Arrange
    deployment_manifest = {"kind": "Deployment", "metadata": {"generation": 1}, "spec": {"replicas": 1}, "status": {}}
    sleeps: list[float] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Expose the resource fields queried during rollout."""

            self.raw = raw
            self.metadata = raw.get("metadata", {})
            self.spec = raw.get("spec", {})

        async def exists(self) -> bool:
            """Keep the Deployment present during rollout."""

            return True

        async def refresh(self) -> None:
            """Keep resource state current between polling attempts."""

    class MigrationJob(Resource):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before rollout polling."""

    async def apply(_resource: Resource) -> None:
        """Accept a resource without contacting Kubernetes."""

    async def sleep(delay: float) -> None:
        """Make the Deployment ready for the next rollout poll."""

        sleeps.append(delay)
        deployment_manifest["status"] = {
            "observedGeneration": 1,
            "replicas": 1,
            "updatedReplicas": 1,
            "readyReplicas": 1,
            "availableReplicas": 1,
        }

    monkeypatch.setattr(
        applications.templates,
        "readyml_list",
        lambda *_args, **_kwargs: (
            {"kind": "Job"},
            deployment_manifest,
            {"kind": "Service"},
            {"kind": "HTTPRoute", "status": {"parents": [{"conditions": [{"type": "Accepted", "status": "True"}, {"type": "ResolvedRefs", "status": "True"}]}]}},
        ),
    )
    monkeypatch.setattr(applications, "Secret", Resource)
    monkeypatch.setattr(applications, "Job", MigrationJob)
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "apply", apply)
    monkeypatch.setattr(applications.asyncio, "sleep", sleep)

    # Act
    await applications.Applications(FakeKubernetes()).apply(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"), "acme", "ghcr.io/longlink/dashboard:latest", {}
    )

    # Assert
    assert sleeps == [5]


async def test_application_logs_returns_failed_migration_logs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return migration logs when no running Application Pod is available."""

    # Arrange
    class PodResource:
        """Represent a failed migration Pod."""

        raw = {"status": {"phase": "Failed"}}
        metadata = {"labels": {"longlink.io/component": "migration"}, "name": "migration-123"}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the failed migration Pod."""

            yield cls()

        async def logs(self, *, tail_lines: int):
            """Yield the recent migration output."""

            assert tail_lines == 200
            yield "migration failed"

    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act
    logs = await applications.Applications(FakeKubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["Migration Pod migration-123 failed:", "migration failed"]


async def test_application_logs_returns_running_application_pod_logs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return recent logs from a running Application Pod before migration fallback."""

    # Arrange
    class PodResource:
        """Represent a running Application Pod."""

        raw = {"status": {"phase": "Running"}}
        metadata = {"labels": {"longlink.io/component": "application"}}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the running Application Pod."""

            yield cls()

        async def logs(self, *, tail_lines: int):
            """Yield recent Application output."""

            assert tail_lines == 200
            yield "application started"

    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act
    logs = await applications.Applications(FakeKubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["application started"]


async def test_application_logs_reports_completed_migration_when_application_pod_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return migration context when the Application Pod has not started."""

    # Arrange
    class PodResource:
        """Represent a completed migration Pod."""

        raw = {"status": {"phase": "Succeeded"}}
        metadata = {"labels": {"longlink.io/component": "migration"}, "name": "migration-123"}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the completed migration Pod."""

            yield cls()

    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act
    logs = await applications.Applications(FakeKubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["Migration Pod migration-123 is Succeeded; Application Pod unavailable"]


async def test_application_logs_reports_unavailable_when_no_pod_exists(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report unavailable logs when no running or failed migration Pod exists."""

    # Arrange
    class PodResource:
        """Return no Application Pods from Kubernetes."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield no matching Pods."""

            if False:
                yield cls()

    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Application logs unavailable"):
        await applications.Applications(FakeKubernetes()).logs(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme"
        )


async def test_application_logs_ignores_terminal_application_pods(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report unavailable logs when only terminal non-migration Pods remain."""

    # Arrange
    class PodResource:
        """Represent a completed Application Pod."""

        raw = {"status": {"phase": "Succeeded"}}
        metadata = {"labels": {"longlink.io/component": "application"}}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the completed Application Pod."""

            yield cls()

    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Application logs unavailable"):
        await applications.Applications(FakeKubernetes()).logs(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme"
        )


async def test_application_logs_translates_kubernetes_api_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hide Kubernetes transport errors behind the Application logs contract."""

    # Arrange
    class KubernetesError(Exception):
        """Represent a Kubernetes API failure."""

    class PodResource:
        """Fail while listing Application Pods."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Raise the Kubernetes API failure."""

            raise KubernetesError("connection failed")
            yield cls()

    monkeypatch.setattr(applications, "APITimeoutError", KubernetesError)
    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Application logs unavailable") as error:
        await applications.Applications(FakeKubernetes()).logs(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme"
        )
    assert isinstance(error.value.__cause__, KubernetesError)


async def test_application_delete_removes_resources_before_waiting_for_pods(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete Application resources once and wait for non-terminal Pods to exit."""

    # Arrange
    deleted: list[str] = []
    resource_checks = 0
    job_checks = 0
    pod_checks = 0
    sleeps: list[float] = []

    class NamespaceResource:
        """Keep the Organization Namespace available for Application cleanup."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the Kubernetes resource constructor arguments."""

        async def exists(self) -> bool:
            """Keep the Namespace present until Application cleanup completes."""

            return True

    class Resource:
        """Expose an Application resource until its initial cleanup poll."""

        def __init__(self, kind: str) -> None:
            """Store the resource kind used to record deletion."""

            self.kind = kind
            self.metadata: dict[str, object] = {}

        async def exists(self) -> bool:
            """Report resources absent after their deletion request."""

            nonlocal resource_checks
            resource_checks += 1
            return resource_checks <= 4

        async def refresh(self) -> None:
            """Keep the fake resource metadata unchanged."""

        async def delete(self) -> None:
            """Record the resource cleanup request."""

            deleted.append(self.kind)

    class JobResource:
        """Expose one retained migration Job during the initial cleanup poll."""

        metadata: dict[str, object] = {}

        async def delete(self) -> None:
            """Record migration Job cleanup."""

            deleted.append("Job")

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the retained migration Job only once."""

            nonlocal job_checks
            job_checks += 1
            if job_checks == 1:
                yield cls()

    class PodResource:
        """Expose a running Pod followed by a terminal Pod."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the current Application Pod state."""

            nonlocal pod_checks
            pod_checks += 1
            phase = "Running" if pod_checks == 1 else "Failed"
            yield type("Pod", (), {"raw": {"status": {"phase": phase}}})()

    async def sleep(delay: float) -> None:
        """Record polling without delaying the test."""

        sleeps.append(delay)

    def resource(kind: str):
        """Create a fake Kubernetes resource constructor."""

        return lambda *_args, **_kwargs: Resource(kind)

    monkeypatch.setattr(applications, "Namespace", NamespaceResource)
    monkeypatch.setattr(applications, "Deployment", resource("Deployment"))
    monkeypatch.setattr(applications, "Service", resource("Service"))
    monkeypatch.setattr(applications, "Secret", resource("Secret"))
    monkeypatch.setattr(applications, "HTTPRouteResource", resource("HTTPRoute"))
    monkeypatch.setattr(applications, "Job", JobResource)
    monkeypatch.setattr(applications, "Pod", PodResource)
    monkeypatch.setattr(applications.asyncio, "sleep", sleep)

    # Act
    await applications.Applications(FakeKubernetes()).delete(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert deleted == ["Deployment", "Service", "Secret", "HTTPRoute", "Job"]
    assert sleeps == [5, 5]


async def test_application_delete_skips_cleanup_when_namespace_is_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop before looking up Application resources in a deleted Namespace."""

    # Arrange
    class NamespaceResource:
        """Report an already deleted Organization Namespace."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the Kubernetes resource constructor arguments."""

        async def exists(self) -> bool:
            """Report the missing Namespace."""

            return False

    class Resource:
        """Fail if cleanup inspects resources for a missing Namespace."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept resource construction before the Namespace presence check."""

        async def exists(self) -> bool:
            """Reject resource inspection after Namespace deletion."""

            raise AssertionError("Application resources must not be inspected after namespace deletion")

    monkeypatch.setattr(applications, "Namespace", NamespaceResource)
    monkeypatch.setattr(applications, "Deployment", Resource)

    # Act
    await applications.Applications(FakeKubernetes()).delete(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )


async def test_application_delete_does_not_repeat_deletions_for_terminating_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Wait for Kubernetes to finish resources that already have deletion timestamps."""

    # Arrange
    deleted: list[str] = []
    namespace_checks = 0
    sleeps: list[float] = []

    class NamespaceResource:
        """Keep the Namespace present for one cleanup poll."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the Kubernetes resource constructor arguments."""

        async def exists(self) -> bool:
            """Report the Namespace as present until cleanup has been rechecked."""

            nonlocal namespace_checks
            namespace_checks += 1
            return namespace_checks == 1

    class Resource:
        """Represent a terminating Kubernetes resource."""

        metadata = {"deletionTimestamp": "2026-08-24T00:00:00Z"}

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the Kubernetes resource constructor arguments."""

        async def exists(self) -> bool:
            """Keep the resource visible during the cleanup poll."""

            return True

        async def refresh(self) -> None:
            """Keep the terminating metadata unchanged."""

        async def delete(self) -> None:
            """Record an invalid duplicate deletion request."""

            deleted.append("resource")

    class JobResource(Resource):
        """Represent a terminating migration Job."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the retained terminating Job."""

            yield cls()

    async def sleep(delay: float) -> None:
        """Record the cleanup retry without waiting."""

        sleeps.append(delay)

    monkeypatch.setattr(applications, "Namespace", NamespaceResource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Secret", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "Job", JobResource)
    monkeypatch.setattr(applications.asyncio, "sleep", sleep)

    # Act
    await applications.Applications(FakeKubernetes()).delete(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"), "acme"
    )

    # Assert
    assert deleted == []
    assert sleeps == [5]
