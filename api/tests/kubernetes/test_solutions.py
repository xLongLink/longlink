import pytest
import asyncio
from uuid import UUID
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

        # Every rendered workload uses the supported runtime architecture.
        assert isinstance(pod_spec, dict)
        assert pod_spec["nodeSelector"] == {"kubernetes.io/os": "linux", "kubernetes.io/arch": "amd64"}
        containers = pod_spec["containers"]
        assert isinstance(containers, list)
        assert len(containers) == 1
        container = containers[0]
        assert isinstance(container, dict)
        resources = container["resources"]
        assert isinstance(resources, dict)

        # Inspect the actual workload's resource requests.
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

    # A failed migration must prevent application Service publication.
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

    # Observe controller state while keeping manifest application local to this test.
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
                # Supply an empty environment so rollout control is tested independently.
                {},
                # Keep the rendered release identity deterministic.
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
            # Recovery of an already-migrated release must not rerun its Job.
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
            # Failing migration diagnostics replace unavailable application logs.
            ["Migration Pod migration-123 failed:", "migration failed"],
            # When no application Pod exists, expose useful migration diagnostics.
            id="failed-migration",
        ),
        pytest.param(
            "Running",
            "solution",
            "solution started",
            {"tail_lines": 200, "container": "solution"},
            ["solution started"],
            # Live application logs take precedence over retained migration output.
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
    sleeps: list[float] = []
    pod_phases = iter(["Running", "Failed"])

    async def exists(_namespace: solutions.Namespace) -> bool:
        """Keep the Organization Namespace available for Solution cleanup."""

        return True

    async def list_resources(
        resource_type: type[solutions.APIObject], *, api: solutions.Api, namespace: str, **selectors: object
    ) -> AsyncIterator[solutions.APIObject]:
        """Yield real Solution resources until their deletion requests."""

        assert namespace == COMPUTE_NAMESPACE
        if resource_type is solutions.KnativeServiceResource:
            assert selectors == {"field_selector": {"metadata.name": "solution-00000000-0000-4000-8000-000000000001"}}

        resource = resource_type({"metadata": {"name": "retained"}}, api=api)
        if resource.kind not in deleted:
            yield resource

    async def delete(resource: solutions.APIObject) -> None:
        """Record the resource cleanup request."""

        deleted.append(resource.kind)

    async def list_pods(*, api: solutions.Api, **_kwargs: object) -> AsyncIterator[solutions.Pod]:
        """Yield a running Pod followed by a terminal Pod."""

        pod = solutions.Pod({"status": {"phase": next(pod_phases)}}, api=api)
        yield pod

    class Clock:
        """Replace only the deletion module's clock without mutating asyncio."""

        @staticmethod
        async def sleep(delay: float) -> None:
            """Record polling without delaying the test."""

            sleeps.append(delay)
            await asyncio.sleep(0)

    monkeypatch.setattr(solutions.Namespace, "exists", exists)
    monkeypatch.setattr(solutions.KnativeServiceResource, "list", classmethod(list_resources))
    monkeypatch.setattr(solutions.Job, "list", classmethod(list_resources))
    monkeypatch.setattr(solutions.Secret, "list", classmethod(list_resources))
    monkeypatch.setattr(solutions.KnativeServiceResource, "delete", delete)
    monkeypatch.setattr(solutions.Job, "delete", delete)
    monkeypatch.setattr(solutions.Secret, "delete", delete)
    monkeypatch.setattr(solutions.Pod, "list", list_pods)
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
    async def exists(_namespace: solutions.Namespace) -> bool:
        """Report the missing Organization Namespace."""

        return False

    def list_resources(**_kwargs: object) -> AsyncIterator[solutions.APIObject]:
        """Reject resource inspection after Namespace deletion."""

        raise AssertionError("Solution resources must not be inspected after namespace deletion")

    monkeypatch.setattr(solutions.Namespace, "exists", exists)
    monkeypatch.setattr(solutions.KnativeServiceResource, "list", list_resources)

    # Act
    await solutions.delete(kubernetes_client(), ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))


async def test_solution_delete_does_not_repeat_deletions_for_terminating_resources(monkeypatch: pytest.MonkeyPatch) -> None:
    """Wait for Kubernetes to finish resources that already have deletion timestamps."""

    # Arrange
    deleted: list[str] = []
    sleeps: list[float] = []
    namespace_states = iter([True, False])

    async def exists(_namespace: solutions.Namespace) -> bool:
        """Keep the Namespace present for one cleanup poll."""

        return next(namespace_states)

    async def list_resources(
        resource_type: type[solutions.APIObject], *, api: solutions.Api, **_kwargs: object
    ) -> AsyncIterator[solutions.APIObject]:
        """Keep real terminating resources visible during the cleanup poll."""

        resource = resource_type({"metadata": {"name": "terminating", "deletionTimestamp": "2026-08-24T00:00:00Z"}}, api=api)
        yield resource

    async def delete(resource: solutions.APIObject) -> None:
        """Record an invalid duplicate deletion request."""

        deleted.append(resource.kind)

    class Clock:
        """Replace only the deletion module's clock without mutating asyncio."""

        @staticmethod
        async def sleep(delay: float) -> None:
            """Record the cleanup retry without waiting."""

            sleeps.append(delay)

    monkeypatch.setattr(solutions.Namespace, "exists", exists)
    monkeypatch.setattr(solutions.KnativeServiceResource, "list", classmethod(list_resources))
    monkeypatch.setattr(solutions.Job, "list", classmethod(list_resources))
    monkeypatch.setattr(solutions.Secret, "list", classmethod(list_resources))
    monkeypatch.setattr(solutions.KnativeServiceResource, "delete", delete)
    monkeypatch.setattr(solutions.Job, "delete", delete)
    monkeypatch.setattr(solutions.Secret, "delete", delete)
    monkeypatch.setattr(solutions, "asyncio", Clock)

    # Act
    await solutions.delete(kubernetes_client(), ORGANIZATION_ID, UUID("00000000-0000-4000-8000-000000000001"))

    # Assert
    assert deleted == []
    assert sleeps == [5]
