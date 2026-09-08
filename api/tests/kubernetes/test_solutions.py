import pytest
from uuid import UUID
from typing import ClassVar, Protocol
from conftest import FakeKubernetes
from src.utils import templates
from src.kubernetes import solutions
from collections.abc import AsyncIterator
from importlib.resources import files

pytestmark = pytest.mark.no_db


class AppliedResource(Protocol):
    """Expose the desired manifest sent to Kubernetes."""

    raw: dict[str, object]


class MigrationJobs:
    """Provide the existing migration Jobs for workload adapter tests."""

    jobs: ClassVar[list[object]] = []

    @classmethod
    async def list(cls, **_kwargs: object):
        """Yield existing Jobs without contacting Kubernetes."""

        for job in cls.jobs:
            yield job


def test_solution_template_constrains_workloads() -> None:
    """Constrain Solution and migration architecture and temporary filesystems."""

    # Arrange
    migration, deployment, _, _ = templates.readyml_list(
        files("src.kubernetes.templates").joinpath("solution", "solution.yml"),
        solution_id="solution",
        solution_id_label="longlink.io/solution-id",
        image='"ghcr.io/longlink/dashboard:latest"',
        namespace="acme",
        runtime_revision="revision",
        migration_id="solution-migration",
        secret_id="solution-revision",
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
        assert pod_spec["nodeSelector"] == {"kubernetes.io/os": "linux", "kubernetes.io/arch": "amd64"}
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

    class MigrationJob(MigrationJobs):
        """Report a terminally failed migration Job."""

        def __init__(self, raw: dict[str, object], *, api: object) -> None:
            """Keep the desired Job and expose its rendered identity."""

            metadata = raw.get("metadata")
            assert isinstance(metadata, dict)
            assert isinstance(metadata.get("name"), str)
            assert isinstance(metadata.get("namespace"), str)
            self.raw = raw
            self.api = api
            self.name = metadata["name"]
            self.namespace = metadata["namespace"]

        async def wait(self, conditions: list[str]) -> None:
            """Supply the failed status returned by Kubernetes."""

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
            assert kwargs["label_selector"] == {"job-name": f"migration-{UUID(int=1)}"}
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

    async def apply(resource: AppliedResource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    def log_error(message: str, *args: object) -> None:
        """Capture formatted operation error output."""

        logged.append(message % args)

    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Pod", MigrationPod)
    monkeypatch.setattr(solutions, "Event", MigrationEvent)
    monkeypatch.setattr(solutions, "apply", apply)
    monkeypatch.setattr(solutions.logger, "error", log_error)

    # Act and assert
    with pytest.raises(RuntimeError, match=r"Solution migration Job .* failed"):
        await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
            revision_id=UUID(int=1),
        )
    assert applied == ["Secret", "Job"]
    assert logged[-1] == "Recent output from migration Pod failed-migration-pod:\ndatabase connection refused"


@pytest.mark.parametrize("migrate", [True, False])
async def test_solution_apply_waits_for_deployment_and_route_readiness(monkeypatch: pytest.MonkeyPatch, migrate: bool) -> None:
    """Stop interrupted migrations, isolate secrets, and skip migrations on rollback."""

    # Arrange
    applied: list[str] = []

    class InterruptedJob:
        """Retain an interrupted migration while stopping its schema mutations."""

        name = "interrupted"
        raw: ClassVar[dict[str, object]] = {"status": {}}

        async def patch(self, patch: dict[str, object]) -> None:
            """Suspend the old migration before applying any new workload."""

            assert patch == {"spec": {"suspend": True}}
            applied.append("suspend")

        async def wait(self, conditions: list[str]) -> None:
            """Acknowledge suspension before checking for remaining Pods."""

            assert conditions == ["condition=Suspended"]
            applied.append("suspended")

    class Resource:
        """Supply Kubernetes-generated rollout state for desired resources."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Expose the resource fields queried during rollout."""

            metadata = raw.get("metadata")
            spec = raw.get("spec")
            assert isinstance(metadata, dict)
            assert isinstance(spec, dict)
            self.raw = raw
            self.metadata = metadata
            self.spec = spec

        async def refresh(self) -> None:
            """Supply ready controller status for the committed manifest."""

            if self.raw.get("kind") == "Deployment":
                self.metadata["generation"] = 1
                self.raw["status"] = {
                    "observedGeneration": 1,
                    "replicas": 1,
                    "updatedReplicas": 1,
                    "readyReplicas": 1,
                    "availableReplicas": 1,
                }
            elif self.raw.get("kind") == "HTTPRoute":
                self.raw["status"] = {
                    "parents": [
                        {
                            "conditions": [
                                {"type": "Accepted", "status": "True"},
                                {"type": "ResolvedRefs", "status": "True"},
                            ]
                        }
                    ]
                }

    class MigrationJob(Resource, MigrationJobs):
        """Report a completed migration Job."""

        jobs: ClassVar[list[object]] = [InterruptedJob()]

        async def wait(self, conditions: list[str]) -> None:
            """Supply the completed status returned by Kubernetes."""

            assert conditions == ["condition=Complete", "condition=Failed"]
            assert migrate
            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(resource: AppliedResource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))
        if resource.raw.get("kind") == "Deployment":
            spec = resource.raw["spec"]
            assert isinstance(spec, dict)
            assert spec["template"]["spec"]["containers"][0]["envFrom"] == [{"secretRef": {"name": f"revision-{UUID(int=1)}"}}]

    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Pod", MigrationJobs)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)

    # Act
    await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
        "ghcr.io/longlink/dashboard:latest",
        {},
        revision_id=UUID(int=1),
        migrate=migrate,
    )

    # Assert
    assert applied == ["suspend", "suspended", "Secret", *(["Job"] if migrate else []), "Service", "HTTPRoute", "Deployment"]


async def test_solution_apply_reports_quota_admission_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop rollout polling when Kubernetes rejects Pods for exceeding quota."""

    # Arrange
    class Resource:
        """Supply Kubernetes-generated quota failure state."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Expose the resource fields queried during rollout."""

            self.raw = raw

        async def refresh(self) -> None:
            """Supply the quota admission failure returned by Kubernetes."""

            self.raw["status"] = {
                "conditions": [
                    {
                        "type": "ReplicaFailure",
                        "reason": "FailedCreate",
                        "message": "exceeded quota: solution Pods",
                    }
                ]
            }

    class MigrationJob(Resource, MigrationJobs):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before the rollout failure."""

            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(_resource: AppliedResource) -> None:
        """Accept a resource without contacting Kubernetes."""

    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes Solution capacity exhausted"):
        await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
            revision_id=UUID(int=1),
        )


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

    class MigrationJob(Resource, MigrationJobs):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before rollout polling."""

            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(_resource: AppliedResource) -> None:
        """Accept a resource without contacting Kubernetes."""

    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Kubernetes Solution Deployment disappeared during rollout"):
        await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"), "acme", "ghcr.io/longlink/dashboard:latest", {}, revision_id=UUID(int=1)
        )


async def test_solution_apply_waits_for_route_after_deployment_readiness(monkeypatch: pytest.MonkeyPatch) -> None:
    """Retry rollout polling until the Deployment and HTTPRoute are ready."""

    # Arrange
    sleeps: list[float] = []

    class Resource:
        """Represent a Kubernetes resource without reaching a cluster."""

        def __init__(self, raw: dict[str, object], **_kwargs: object) -> None:
            """Keep one committed manifest for generated status updates."""

            metadata = raw.get("metadata")
            spec = raw.get("spec")
            assert isinstance(metadata, dict)
            assert isinstance(spec, dict)
            self.raw = raw
            self.metadata = metadata
            self.spec = spec
            kind = raw.get("kind")
            assert isinstance(kind, str)
            resources[kind] = self
            if kind == "Deployment":
                self.metadata["generation"] = 1

        async def refresh(self) -> None:
            """Keep resource state current between polling attempts."""

    class MigrationJob(Resource, MigrationJobs):
        """Report a completed migration Job."""

        async def wait(self, _conditions: list[str]) -> None:
            """Complete the migration before rollout polling."""

            self.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def apply(_resource: AppliedResource) -> None:
        """Accept a resource without contacting Kubernetes."""

    async def sleep(delay: float) -> None:
        """Make each independent rollout gate ready in sequence."""

        sleeps.append(delay)
        if len(sleeps) == 1:
            resources["Deployment"].raw["status"] = {
                "observedGeneration": 1,
                "replicas": 1,
                "updatedReplicas": 1,
                "readyReplicas": 1,
                "availableReplicas": 1,
            }
        else:
            resources["HTTPRoute"].raw["status"] = {
                "parents": [{"conditions": [{"type": "Accepted", "status": "True"}, {"type": "ResolvedRefs", "status": "True"}]}]
            }

    resources: dict[str, Resource] = {}

    monkeypatch.setattr(solutions, "Job", MigrationJob)
    monkeypatch.setattr(solutions, "Deployment", Resource)
    monkeypatch.setattr(solutions, "HTTPRouteResource", Resource)
    monkeypatch.setattr(solutions, "apply", apply)
    monkeypatch.setattr(solutions.asyncio, "sleep", sleep)

    # Act
    await solutions.Solutions(FakeKubernetes()).apply(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"), "acme", "ghcr.io/longlink/dashboard:latest", {}, revision_id=UUID(int=1)
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
            return resource_checks <= 3

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

    class SecretResource:
        """Expose revision secrets only before their deletion."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield a retained revision secret once."""

            if "Secret" not in deleted:
                yield Resource("Secret")

    async def sleep(delay: float) -> None:
        """Record polling without delaying the test."""

        sleeps.append(delay)

    def resource(kind: str):
        """Create a fake Kubernetes resource constructor."""

        return lambda *_args, **_kwargs: Resource(kind)

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "Deployment", resource("Deployment"))
    monkeypatch.setattr(solutions, "Service", resource("Service"))
    monkeypatch.setattr(solutions, "Secret", SecretResource)
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
    assert deleted == ["Deployment", "Service", "HTTPRoute", "Job", "Secret"]
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
    monkeypatch.setattr(solutions, "Secret", JobResource)
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
