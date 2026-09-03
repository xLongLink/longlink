import pytest
from uuid import UUID
from typing import ClassVar
from conftest import FakeKubernetes
from src.utils import templates
from src.kubernetes import solutions
from collections.abc import AsyncIterator
from importlib.resources import files

pytestmark = pytest.mark.no_db


def test_solution_template_limits_ephemeral_storage() -> None:
    """Bound each Solution and migration temporary filesystem."""

    # Arrange
    migration, deployment, _, _ = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("solution", "solution.yml"),
        solution_id="solution",
        solution_id_label="longlink.io/solution-id",
        image='"ghcr.io/longlink/dashboard:latest"',
        namespace="acme",
        runtime_revision="revision",
        migration_id="solution-migration",
    )

    # Assert
    migration_spec = migration["spec"]
    assert isinstance(migration_spec, dict)
    assert "ttlSecondsAfterFinished" not in migration_spec
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


async def test_solution_apply_stops_after_failed_migration_job(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid creating runtime resources when the Solution migration fails."""

    # Arrange
    applied: list[str] = []
    logged: list[str] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the resource manifest for apply assertions."""

            self.raw = raw
            self.api = _kwargs.get("api")

    class MigrationJob(Resource):
        """Report a terminally failed migration Job."""

        name = "00000000-0000-4000-8000-000000000001-migration-5d5aa840"
        namespace = "acme"

        async def wait(self, conditions: list[str]) -> None:
            """Accept the migration terminal conditions."""

            assert conditions == ["condition=Complete", "condition=Failed"]
            self.raw["status"] = {"conditions": [{"type": "Failed", "status": "True"}]}

    class MigrationPod:
        """Expose output from the failed migration Job."""

        name: ClassVar[str] = "failed-migration-pod"
        metadata: ClassVar[dict[str, object]] = {"name": "failed-migration-pod"}
        raw: ClassVar[dict[str, object]] = {"status": {"phase": "Failed"}}

        @classmethod
        async def list(cls, **kwargs: object) -> AsyncIterator["MigrationPod"]:
            """Yield the failed migration Pod selected by its Job label."""

            assert kwargs["namespace"] == "acme"
            assert kwargs["label_selector"] == {
                "job-name": "00000000-0000-4000-8000-000000000001-migration-5d5aa840"
            }
            yield cls()

        async def logs(self, tail_lines: int) -> AsyncIterator[str]:
            """Yield recent migration output."""

            assert tail_lines == 200
            yield "database connection refused"

    class MigrationEvent:
        """Expose no warning Events for the failed migration fixture."""

        @classmethod
        async def list(cls, **_kwargs: object) -> AsyncIterator["MigrationEvent"]:
            """Yield no Kubernetes Events."""

            if False:
                yield cls()

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    def log_error(message: str, *args: object) -> None:
        """Capture formatted operation error output."""

        logged.append(message % args)

    monkeypatch.setattr(
        solutions.templates,
        "readyml_list",
        lambda *_args, **_kwargs: (
            {"kind": "Job"},
            {"kind": "Deployment"},
            {"kind": "Service"},
            {"kind": "HTTPRoute"},
        ),
    )
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Pod", MigrationPod)
    monkeypatch.setattr(solutions, "Event", MigrationEvent)
    monkeypatch.setattr(solutions, "Service", Resource)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)
    monkeypatch.setattr(solutions.logger, "error", log_error)

    # Act and assert
    with pytest.raises(RuntimeError, match=r"Solution migration Job .* failed"):
        await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
        )
    assert applied == ["Secret", "Job"]
    assert logged[-1] == "Recent output from migration Pod failed-migration-pod:\ndatabase connection refused"


async def test_solution_apply_waits_for_deployment_and_route_readiness(monkeypatch: pytest.MonkeyPatch) -> None:
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
            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    monkeypatch.setattr(
        solutions.templates,
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
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Service", Resource)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)

    # Act
    await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
        "ghcr.io/longlink/dashboard:latest",
        {},
    )

    # Assert
    assert applied == ["Secret", "Job", "Service", "HTTPRoute", "Deployment"]


async def test_solution_apply_reports_quota_admission_failure(monkeypatch: pytest.MonkeyPatch) -> None:
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

            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    monkeypatch.setattr(
        solutions.templates,
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
                            "message": "exceeded quota: solution Pods",
                        }
                    ]
                },
            },
            {"kind": "Service"},
            {"kind": "HTTPRoute"},
        ),
    )
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Service", Resource)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes Solution capacity exhausted"):
        await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
        )
    assert applied == ["Secret", "Job", "Service", "HTTPRoute", "Deployment"]


async def test_solution_apply_reports_disappeared_deployment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop rollout polling when the Solution Deployment disappears."""

    # Arrange
    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep the resource manifest."""

            self.raw = raw

        async def refresh(self) -> None:
            """Report that the Deployment disappeared before rollout completed."""

            raise solutions.NotFoundError("Deployment missing")

    class MigrationJob(Resource):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before rollout polling."""

            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(_resource: Resource) -> None:
        """Accept a resource without contacting Kubernetes."""

    monkeypatch.setattr(
        solutions.templates,
        "readyml_list",
        lambda *_args, **_kwargs: ({"kind": "Job"}, {"kind": "Deployment"}, {"kind": "Service"}, {"kind": "HTTPRoute"}),
    )
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Service", Resource)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes Solution Deployment disappeared during rollout"):
        await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme", "ghcr.io/longlink/dashboard:latest", {}
        )


async def test_solution_apply_waits_for_route_after_deployment_readiness(monkeypatch: pytest.MonkeyPatch) -> None:
    """Retry rollout polling until the Deployment and HTTPRoute are ready."""

    # Arrange
    deployment_manifest = {"kind": "Deployment", "metadata": {"generation": 1}, "spec": {"replicas": 1}, "status": {}}
    route_manifest: dict[str, object] = {"kind": "HTTPRoute", "status": {"parents": []}}
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

            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(_resource: Resource) -> None:
        """Accept a resource without contacting Kubernetes."""

    async def sleep(delay: float) -> None:
        """Make each independent rollout gate ready in sequence."""

        sleeps.append(delay)
        if len(sleeps) == 1:
            deployment_manifest["status"] = {
                "observedGeneration": 1,
                "replicas": 1,
                "updatedReplicas": 1,
                "readyReplicas": 1,
                "availableReplicas": 1,
            }
        else:
            route_manifest["status"] = {
                "parents": [{"conditions": [{"type": "Accepted", "status": "True"}, {"type": "ResolvedRefs", "status": "True"}]}]
            }

    monkeypatch.setattr(
        solutions.templates,
        "readyml_list",
        lambda *_args, **_kwargs: (
            {"kind": "Job"},
            deployment_manifest,
            {"kind": "Service"},
            route_manifest,
        ),
    )
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Service", Resource)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)
    monkeypatch.setattr(solutions.asyncio, "sleep", sleep)

    # Act
    await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"), "acme", "ghcr.io/longlink/dashboard:latest", {}
    )

    # Assert
    assert sleeps == [5, 5]


async def test_solution_logs_returns_failed_migration_logs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return migration logs when no running Solution Pod is available."""

    # Arrange
    class PodResource:
        """Represent a failed migration Pod."""

        raw: ClassVar[dict[str, object]] = {"status": {"phase": "Failed"}}
        metadata: ClassVar[dict[str, object]] = {"labels": {"longlink.io/component": "migration"}, "name": "migration-123"}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the failed migration Pod."""

            yield cls()

        async def logs(self, *, tail_lines: int):
            """Yield the recent migration output."""

            assert tail_lines == 200
            yield "migration failed"

    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act
    logs = await solutions.Solutions(FakeKubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["Migration Pod migration-123 failed:", "migration failed"]


async def test_solution_logs_returns_running_solution_pod_logs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return recent logs from a running Solution Pod before migration fallback."""

    # Arrange
    class PodResource:
        """Represent a running Solution Pod."""

        raw: ClassVar[dict[str, object]] = {"status": {"phase": "Running"}}
        metadata: ClassVar[dict[str, object]] = {"labels": {"longlink.io/component": "solution"}}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the running Solution Pod."""

            yield cls()

        async def logs(self, *, tail_lines: int):
            """Yield recent Solution output."""

            assert tail_lines == 200
            yield "solution started"

    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act
    logs = await solutions.Solutions(FakeKubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["solution started"]


async def test_solution_logs_reports_completed_migration_when_solution_pod_is_unavailable(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Return migration context when the Solution Pod has not started."""

    # Arrange
    class PodResource:
        """Represent a completed migration Pod."""

        raw: ClassVar[dict[str, object]] = {"status": {"phase": "Succeeded"}}
        metadata: ClassVar[dict[str, object]] = {"labels": {"longlink.io/component": "migration"}, "name": "migration-123"}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the completed migration Pod."""

            yield cls()

    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act
    logs = await solutions.Solutions(FakeKubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["Migration Pod migration-123 is Succeeded; Solution Pod unavailable"]


async def test_solution_logs_reports_unavailable_when_no_pod_exists(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report unavailable logs when no running or failed migration Pod exists."""

    # Arrange
    class PodResource:
        """Return no Solution Pods from Kubernetes."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield no matching Pods."""

            if False:
                yield cls()

    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Solution logs unavailable"):
        await solutions.Solutions(FakeKubernetes()).logs(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme"
        )


async def test_solution_logs_ignores_terminal_solution_pods(monkeypatch: pytest.MonkeyPatch) -> None:
    """Report unavailable logs when only terminal non-migration Pods remain."""

    # Arrange
    class PodResource:
        """Represent a completed Solution Pod."""

        raw: ClassVar[dict[str, object]] = {"status": {"phase": "Succeeded"}}
        metadata: ClassVar[dict[str, object]] = {"labels": {"longlink.io/component": "solution"}}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the completed Solution Pod."""

            yield cls()

    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Solution logs unavailable"):
        await solutions.Solutions(FakeKubernetes()).logs(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme"
        )


async def test_solution_logs_translates_kubernetes_api_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hide Kubernetes transport errors behind the Solution logs contract."""

    # Arrange
    class KubernetesError(Exception):
        """Represent a Kubernetes API failure."""

    class PodResource:
        """Fail while listing Solution Pods."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Raise the Kubernetes API failure."""

            raise KubernetesError("connection failed")
            yield cls()

    monkeypatch.setattr(solutions, "APITimeoutError", KubernetesError)
    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Solution logs unavailable") as error:
        await solutions.Solutions(FakeKubernetes()).logs(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme"
        )
    assert isinstance(error.value.__cause__, KubernetesError)


async def test_solution_delete_removes_resources_before_waiting_for_pods(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete Solution resources once and wait for non-terminal Pods to exit."""

    # Arrange
    deleted: list[str] = []
    resource_checks = 0
    job_checks = 0
    pod_checks = 0
    sleeps: list[float] = []

    class NamespaceResource:
        """Keep the Organization Namespace available for Solution cleanup."""

        def __init__(self, *_args: object, **_kwargs: object) -> None:
            """Accept the Kubernetes resource constructor arguments."""

        async def exists(self) -> bool:
            """Keep the Namespace present until Solution cleanup completes."""

            return True

    class Resource:
        """Expose a Solution resource until its initial cleanup poll."""

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

        metadata: ClassVar[dict[str, object]] = {}

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
            """Yield the current Solution Pod state."""

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

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "Deployment", resource("Deployment"))
    monkeypatch.setattr(solutions, "Service", resource("Service"))
    monkeypatch.setattr(solutions, "Secret", resource("Secret"))
    monkeypatch.setattr(solutions, "HTTPRouteResource", resource("HTTPRoute"))
    monkeypatch.setattr(solutions, "Job", JobResource)
    monkeypatch.setattr(solutions, "Pod", PodResource)
    monkeypatch.setattr(solutions.asyncio, "sleep", sleep)

    # Act
    await solutions.Solutions(FakeKubernetes()).delete(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert deleted == ["Deployment", "Service", "Secret", "HTTPRoute", "Job"]
    assert sleeps == [5, 5]


async def test_solution_delete_skips_cleanup_when_namespace_is_absent(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop before looking up Solution resources in a deleted Namespace."""

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

            raise AssertionError("Solution resources must not be inspected after namespace deletion")

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "Deployment", Resource)

    # Act
    await solutions.Solutions(FakeKubernetes()).delete(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )


async def test_solution_delete_does_not_repeat_deletions_for_terminating_resources(monkeypatch: pytest.MonkeyPatch) -> None:
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

        metadata: ClassVar[dict[str, object]] = {"deletionTimestamp": "2026-08-24T00:00:00Z"}

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

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "Service", Resource)
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "Job", JobResource)
    monkeypatch.setattr(solutions.asyncio, "sleep", sleep)

    # Act
    await solutions.Solutions(FakeKubernetes()).delete(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"), "acme"
    )

    # Assert
    assert deleted == []
    assert sleeps == [5]
