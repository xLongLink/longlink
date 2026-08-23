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
