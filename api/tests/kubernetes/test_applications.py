import pytest
from uuid import UUID
from src.kubernetes import applications

pytestmark = pytest.mark.no_db


async def test_application_apply_stops_after_failed_migration_job(monkeypatch: pytest.MonkeyPatch) -> None:
    """Avoid creating runtime resources when the Application migration fails."""

    # Arrange
    applied: list[str] = []

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

    class Kubernetes:
        """Provide an opaque Kubernetes API client."""

        async def api(self) -> object:
            """Return the fake API client."""

            return object()

    async def apply(resource: Resource) -> None:
        """Record the resources accepted by Kubernetes."""

        applied.append(str(resource.raw.get("kind", "Secret")))

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
    monkeypatch.setattr(applications, "Service", Resource)
    monkeypatch.setattr(applications, "Deployment", Resource)
    monkeypatch.setattr(applications, "HTTPRouteResource", Resource)
    monkeypatch.setattr(applications, "apply", apply)

    # Act and assert
    with pytest.raises(RuntimeError, match="Application migrations failed"):
        await applications.Applications(Kubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
        )
    assert applied == ["Secret", "Job"]


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

    class Kubernetes:
        """Provide an opaque Kubernetes API client."""

        async def api(self) -> object:
            """Return the fake API client."""

            return object()

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
    await applications.Applications(Kubernetes()).apply(  # type: ignore[arg-type]
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

    class Kubernetes:
        """Provide an opaque Kubernetes API client."""

        async def api(self) -> object:
            """Return the fake API client."""

            return object()

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
        await applications.Applications(Kubernetes()).apply(  # type: ignore[arg-type]
            UUID("00000000-0000-4000-8000-000000000001"),
            "acme",
            "ghcr.io/longlink/dashboard:latest",
            {},
        )
    assert applied == ["Secret", "Job", "Service", "HTTPRoute", "Deployment"]


async def test_application_logs_returns_failed_migration_logs(monkeypatch: pytest.MonkeyPatch) -> None:
    """Return migration logs when no running Application Pod is available."""

    # Arrange
    class PodResource:
        """Represent a failed migration Pod."""

        raw = {"status": {"phase": "Failed"}}
        metadata = {"labels": {"longlink.io/component": "migration"}}

        @classmethod
        async def list(cls, **_kwargs: object):
            """Yield the failed migration Pod."""

            yield cls()

        async def logs(self, *, tail_lines: int):
            """Yield the recent migration output."""

            assert tail_lines == 200
            yield "migration failed"

    class Kubernetes:
        """Provide an opaque Kubernetes API client."""

        async def api(self) -> object:
            """Return the fake API client."""

            return object()

    monkeypatch.setattr(applications, "Pod", PodResource)

    # Act
    logs = await applications.Applications(Kubernetes()).logs(  # type: ignore[arg-type]
        UUID("00000000-0000-4000-8000-000000000001"),
        "acme",
    )

    # Assert
    assert logs == ["Migration logs:", "migration failed"]
