import pytest
import asyncio
from uuid import UUID
from typing import ClassVar
from conftest import kubernetes_client
from src.utils import templates
from src.kubernetes import solutions
from collections.abc import AsyncIterator
from importlib.resources import files

pytestmark = pytest.mark.no_db
ORGANIZATION_ID = UUID("00000000-0000-4000-8000-000000000002")
COMPUTE_NAMESPACE = "longlink-compute-00000000000040008000000000000002"


@pytest.fixture
def listed_jobs(monkeypatch: pytest.MonkeyPatch) -> list[solutions.Job]:
    """Supply real migration Jobs at the Kubernetes listing boundary."""

    jobs: list[solutions.Job] = []

    async def list_jobs(**_kwargs: object) -> AsyncIterator[solutions.Job]:
        """Yield existing Jobs without contacting Kubernetes."""

        for job in jobs:
            yield job

    monkeypatch.setattr(solutions.Job, "list", list_jobs)
    return jobs


@pytest.fixture
def listed_pods(monkeypatch: pytest.MonkeyPatch) -> list[solutions.Pod]:
    """Supply real Pod observations at the Kubernetes listing boundary."""

    pods: list[solutions.Pod] = []

    async def list_pods(**_kwargs: object) -> AsyncIterator[solutions.Pod]:
        """Yield the Pods selected by the test without contacting Kubernetes."""

        for pod in pods:
            yield pod

    monkeypatch.setattr(solutions.Pod, "list", list_pods)
    return pods


def test_solution_template_constrains_workloads() -> None:
    """Constrain Solution and migration architecture and temporary filesystems."""

    # Arrange
    migration, deployment = templates.readyml_list(
        files("src").joinpath(".static", "kubernetes", "solution.yml"),
        solution_id="solution",
        image='"ghcr.io/longlink/dashboard:latest"',
        namespace="acme",
        runtime_revision="revision",
        migration_id="solution-migration",
        secret_id="solution-revision",
        pull_secrets="[]",
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
        assert isinstance(containers, list)
        assert len(containers) == 1
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

        # Only the runtime is probed; database outages must not trigger liveness restarts.
        if workload is deployment:
            assert pod_template["metadata"]["annotations"]["autoscaling.knative.dev/min-scale"] == "0"
            assert container["startupProbe"] == {"httpGet": {"path": "/health", "port": 8000}, "periodSeconds": 5, "failureThreshold": 60}
            assert container["livenessProbe"] == {"httpGet": {"path": "/health", "port": 8000}, "periodSeconds": 10, "failureThreshold": 3}
            assert container["readinessProbe"] == {
                "httpGet": {"path": "/ready", "port": 8000},
                "timeoutSeconds": 5,
                "periodSeconds": 5,
                "failureThreshold": 3,
            }


@pytest.mark.usefixtures("listed_jobs")
async def test_solution_apply_stops_after_failed_migration_job(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid creating runtime resources when the Solution migration fails."""

    # Arrange
    applied: list[str] = []

    async def refresh(job: solutions.Job) -> None:
        """Supply the failed status returned by Kubernetes."""

        job.raw["status"] = {"conditions": [{"type": "Failed", "status": "True"}]}

    async def apply(resource: solutions.APIObject) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

    monkeypatch.setattr(solutions.Job, "refresh", refresh)
    monkeypatch.setattr(solutions.utils, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match=r"Solution migration Job .* failed"):
        await solutions.apply(
            kubernetes_client(),
            ORGANIZATION_ID,
            UUID("00000000-0000-4000-8000-000000000001"),
            "ghcr.io/longlink/dashboard:latest",
            {},
            revision_id=UUID(int=1),
        )
    assert applied == ["Secret", "Job"]


@pytest.mark.parametrize("migrate", [True, False])
@pytest.mark.usefixtures("listed_pods")
async def test_solution_apply_waits_for_deployment_and_route_readiness(
    monkeypatch: pytest.MonkeyPatch, listed_jobs: list[solutions.Job], migrate: bool
) -> None:
    """Stop interrupted migrations, isolate secrets, and skip migrations on rollback."""

    # Arrange
    applied: list[str] = []

    client = kubernetes_client()
    interrupted = solutions.Job({"metadata": {"name": "interrupted"}, "status": {}}, api=await client.api())
    listed_jobs.append(interrupted)

    async def patch(job: solutions.Job, patch: dict[str, object]) -> None:
        """Suspend the old migration before applying any new workload."""

        assert job is interrupted
        assert patch == {"spec": {"suspend": True}}
        applied.append("suspend")

    async def refresh_job(job: solutions.Job) -> None:
        """Acknowledge suspension or completion of the selected migration Job."""

        if job is interrupted:
            applied.append("suspended")
            job.raw["status"] = {"conditions": [{"type": "Suspended", "status": "True"}]}
        else:
            assert migrate
            job.raw["status"] = {"conditions": [{"type": "Complete", "status": "True"}]}

    async def refresh_service(service: solutions.APIObject) -> None:
        """Supply ready controller status for the committed manifest."""

        service.metadata["generation"] = 1
        service.raw["status"] = {
            "observedGeneration": 1,
            "latestCreatedRevisionName": "revision",
            "latestReadyRevisionName": "revision",
            "conditions": [{"type": "Ready", "status": "True"}],
        }

    async def apply(resource: solutions.APIObject) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))
        if resource.raw.get("apiVersion") == "serving.knative.dev/v1":
            spec = resource.raw["spec"]
            assert isinstance(spec, dict)
            assert spec["template"]["spec"]["containers"][0]["envFrom"] == [{"secretRef": {"name": f"revision-{UUID(int=1)}"}}]

    monkeypatch.setattr(solutions.Job, "patch", patch)
    monkeypatch.setattr(solutions.Job, "refresh", refresh_job)
    monkeypatch.setattr(solutions.KnativeServiceResource, "refresh", refresh_service)
    monkeypatch.setattr(solutions.utils, "apply", apply)

    # Act
    await solutions.apply(
        client,
        ORGANIZATION_ID,
        UUID("00000000-0000-4000-8000-000000000001"),
        "ghcr.io/longlink/dashboard:latest",
        {},
        revision_id=UUID(int=1),
        migrate=migrate,
    )

    # Assert
    assert applied == ["suspend", "suspended", "Secret", *(["Job"] if migrate else []), "Service"]


@pytest.mark.usefixtures("listed_jobs")
async def test_solution_apply_reports_quota_admission_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop rollout polling when Kubernetes rejects Pods for exceeding quota."""

    # Arrange
    async def refresh(resource: solutions.APIObject) -> None:
        """Supply the quota admission failure returned by Kubernetes."""

        resource.metadata["generation"] = 1
        resource.raw["status"] = {
            "conditions": [{"type": "Ready", "status": "False", "reason": "RevisionFailed", "message": "exceeded quota: solution Pods"}]
        }

    async def apply(_resource: solutions.APIObject) -> None:
        """Accept a resource without contacting Kubernetes."""

    monkeypatch.setattr(solutions.KnativeServiceResource, "refresh", refresh)
    monkeypatch.setattr(solutions.utils, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="capacity exhausted"):
        async with asyncio.timeout(1):
            await solutions.apply(
                kubernetes_client(),
                ORGANIZATION_ID,
                UUID("00000000-0000-4000-8000-000000000001"),
                "ghcr.io/longlink/dashboard:latest",
                {},
                revision_id=UUID(int=1),
                migrate=False,
            )


@pytest.mark.usefixtures("listed_jobs")
async def test_solution_apply_reports_disappeared_deployment(monkeypatch: pytest.MonkeyPatch) -> None:
    """Stop rollout polling when the Knative Solution Service disappears."""

    # Arrange
    async def refresh(_resource: solutions.APIObject) -> None:
        """Report that the Knative Service disappeared before rollout completed."""

        raise solutions.NotFoundError("Knative Service missing")

    async def apply(_resource: solutions.APIObject) -> None:
        """Accept a resource without contacting Kubernetes."""

    monkeypatch.setattr(solutions.KnativeServiceResource, "refresh", refresh)
    monkeypatch.setattr(solutions.utils, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Knative Solution Service disappeared during rollout"):
        await solutions.apply(
            kubernetes_client(),
            ORGANIZATION_ID,
            UUID("00000000-0000-4000-8000-000000000001"),
            "ghcr.io/longlink/dashboard:latest",
            {},
            revision_id=UUID(int=1),
            migrate=False,
        )


@pytest.mark.usefixtures("listed_jobs")
async def test_solution_apply_waits_for_route_after_deployment_readiness(monkeypatch: pytest.MonkeyPatch) -> None:
    """Retry rollout polling until Knative reports the current revision ready."""

    # Arrange
    sleeps: list[float] = []

    rollout_states = iter(
        [
            {},
            {
                "status": {
                    "observedGeneration": 1,
                    "latestCreatedRevisionName": "new-revision",
                    "latestReadyRevisionName": "old-revision",
                    "conditions": [{"type": "Ready", "status": "True"}],
                }
            },
            {
                "status": {
                    "observedGeneration": 1,
                    "latestCreatedRevisionName": "new-revision",
                    "latestReadyRevisionName": "new-revision",
                    "conditions": [{"type": "Ready", "status": "True"}],
                }
            },
        ]
    )

    async def refresh(resource: solutions.APIObject) -> None:
        """Supply missing status, an old ready revision, then the current revision."""

        resource.metadata["generation"] = 1
        resource.raw.update(next(rollout_states))

    async def apply(_resource: solutions.APIObject) -> None:
        """Accept a resource without contacting Kubernetes."""

    class Clock:
        """Replace only the rollout module's clock without mutating asyncio."""

        @staticmethod
        async def sleep(delay: float) -> None:
            """Record polling without delaying the test."""

            sleeps.append(delay)

    monkeypatch.setattr(solutions.KnativeServiceResource, "refresh", refresh)
    monkeypatch.setattr(solutions.utils, "apply", apply)
    monkeypatch.setattr(solutions, "asyncio", Clock)

    # Act
    await solutions.apply(
        kubernetes_client(),
        ORGANIZATION_ID,
        UUID("00000000-0000-4000-8000-000000000001"),
        "ghcr.io/longlink/dashboard:latest",
        {},
        revision_id=UUID(int=1),
        migrate=False,
    )

    # Assert
    assert sleeps == [5, 5]


@pytest.mark.parametrize(
    ("phase", "component", "line", "log_kwargs", "expected"),
    [
        pytest.param(
            "Failed",
            "migration",
            "migration failed",
            {"tail_lines": 200},
            ["Migration Pod migration-123 failed:", "migration failed"],
            id="failed-migration",
        ),
        pytest.param(
            "Running",
            "solution",
            "solution started",
            {"tail_lines": 200, "container": "solution"},
            ["solution started"],
            id="running-solution",
        ),
    ],
)
async def test_solution_logs_returns_pod_output(
    monkeypatch: pytest.MonkeyPatch,
    listed_pods: list[solutions.Pod],
    phase: str,
    component: str,
    line: str,
    log_kwargs: dict[str, object],
    expected: list[str],
) -> None:
    """Return recent Pod output with the component-specific log options and context."""

    # Arrange
    client = kubernetes_client()
    pod = solutions.Pod(
        {"metadata": {"labels": {"longlink.io/component": component}, "name": "migration-123"}, "status": {"phase": phase}},
        api=await client.api(),
    )
    listed_pods.append(pod)

    async def logs(_pod: solutions.Pod, **kwargs: object) -> AsyncIterator[str]:
        """Verify the exact log options before yielding the configured output."""

        assert kwargs == log_kwargs
        yield line

    monkeypatch.setattr(solutions.Pod, "logs", logs)

    # Act
    output = await solutions.logs(client, ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert output == expected


async def test_solution_logs_reports_completed_migration_when_solution_pod_is_unavailable(listed_pods: list[solutions.Pod]) -> None:
    """Return migration context when the Solution Pod has not started."""

    # Arrange
    client = kubernetes_client()
    pod = solutions.Pod(
        {"metadata": {"labels": {"longlink.io/component": "migration"}, "name": "migration-123"}, "status": {"phase": "Succeeded"}},
        api=await client.api(),
    )
    listed_pods.append(pod)

    # Act
    logs = await solutions.logs(client, ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert logs == ["Migration Pod migration-123 is Succeeded; Solution Pod unavailable"]


@pytest.mark.parametrize("phase", [None, "Succeeded"], ids=["no-pod", "terminal-solution-pod"])
async def test_solution_logs_reports_unavailable_without_usable_pods(listed_pods: list[solutions.Pod], phase: str | None) -> None:
    """Report unavailable logs when no running or failed migration Pod exists."""

    # Arrange
    client = kubernetes_client()
    if phase is not None:
        pod = solutions.Pod(
            {"metadata": {"labels": {"longlink.io/component": "solution"}}, "status": {"phase": phase}}, api=await client.api()
        )
        listed_pods.append(pod)

    # Act and assert
    with pytest.raises(RuntimeError, match="Solution logs unavailable"):
        await solutions.logs(client, ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))


async def test_solution_logs_translates_kubernetes_api_errors(monkeypatch: pytest.MonkeyPatch) -> None:
    """Hide Kubernetes transport errors behind the Solution logs contract."""

    # Arrange
    class PodResource:
        """Fail while listing Solution Pods."""

        @classmethod
        async def list(cls, **_kwargs: object):
            """Raise the Kubernetes API failure."""

            raise solutions.APITimeoutError("connection failed")
            yield cls()

    monkeypatch.setattr(solutions, "Pod", PodResource)

    # Act and assert
    with pytest.raises(RuntimeError, match="Solution logs unavailable") as error:
        await solutions.logs(kubernetes_client(), ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))
    assert isinstance(error.value.__cause__, solutions.APITimeoutError)


async def test_solution_delete_removes_resources_before_waiting_for_pods(monkeypatch: pytest.MonkeyPatch) -> None:
    """Delete Solution resources once and wait for non-terminal Pods to exit."""

    # Arrange
    deleted: list[str] = []
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
        """Expose a Solution resource until its deletion request."""

        def __init__(self, kind: str) -> None:
            """Store the resource kind used to record deletion."""

            self.kind = kind
            self.metadata: dict[str, object] = {}

        @classmethod
        async def list(cls, *, api: object, namespace: str, field_selector: dict[str, str]):
            """Return the named Service only before its deletion request."""

            assert namespace == COMPUTE_NAMESPACE
            assert field_selector == {"metadata.name": "solution-00000000-0000-4000-8000-000000000001"}
            if "Service" not in deleted:
                yield cls("Service")

        async def delete(self) -> None:
            """Record the resource cleanup request."""

            deleted.append(self.kind)

    class JobResource:
        """Expose the retained migration Job until its deletion request."""

        metadata: ClassVar[dict[str, object]] = {}

        async def delete(self) -> None:
            """Record migration Job cleanup."""

            deleted.append("Job")

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the migration Job while it has not been deleted."""

            if "Job" not in deleted:
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

    class Clock:
        """Replace only the deletion module's clock without mutating asyncio."""

        @staticmethod
        async def sleep(delay: float) -> None:
            """Record polling without delaying the test."""

            sleeps.append(delay)
            await asyncio.sleep(0)

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "KnativeServiceResource", Resource)
    monkeypatch.setattr(solutions, "Secret", SecretResource)
    monkeypatch.setattr(solutions, "Job", JobResource)
    monkeypatch.setattr(solutions, "Pod", PodResource)
    monkeypatch.setattr(solutions, "asyncio", Clock)

    # Act
    async with asyncio.timeout(5):
        await solutions.delete(kubernetes_client(), ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert deleted == ["Service", "Job", "Secret"]
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

        @classmethod
        async def list(cls, **_kwargs: object):
            """Reject resource inspection after Namespace deletion."""

            raise AssertionError("Solution resources must not be inspected after namespace deletion")
            yield cls()

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "KnativeServiceResource", Resource)

    # Act
    await solutions.delete(kubernetes_client(), ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))


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

        @classmethod
        async def list(cls, **_kwargs: object):
            """Keep the terminating resource visible during the cleanup poll."""

            yield cls()

        async def delete(self) -> None:
            """Record an invalid duplicate deletion request."""

            deleted.append("resource")

    class Clock:
        """Replace only the deletion module's clock without mutating asyncio."""

        @staticmethod
        async def sleep(delay: float) -> None:
            """Record the cleanup retry without waiting."""

            sleeps.append(delay)

    monkeypatch.setattr(solutions, "Namespace", NamespaceResource)
    monkeypatch.setattr(solutions, "KnativeServiceResource", Resource)
    monkeypatch.setattr(solutions, "Secret", Resource)
    monkeypatch.setattr(solutions, "Job", Resource)
    monkeypatch.setattr(solutions, "asyncio", Clock)

    # Act
    await solutions.delete(kubernetes_client(), ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert deleted == []
    assert sleeps == [5]
