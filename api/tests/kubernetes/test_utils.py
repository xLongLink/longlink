import pytest
from kr8s import NotFoundError
from typing import cast
from kr8s.asyncio.objects import APIObject
from src.kubernetes.utils import apply

pytestmark = pytest.mark.no_db


@pytest.mark.parametrize(
    ("exists", "expected_calls"),
    [
        pytest.param(False, [("patch", {"metadata": {"name": "dashboard"}}), ("create", None)], id="missing"),
        pytest.param(True, [("patch", {"metadata": {"name": "dashboard"}})], id="existing"),
    ],
)
async def test_apply_creates_missing_resources_and_repairs_existing_ones(
    exists: bool, expected_calls: list[tuple[str, object | None]]
) -> None:
    """Create absent resources and patch existing resources with their desired manifest."""

    # Arrange
    calls: list[tuple[str, object | None]] = []

    class Resource:
        """Record Kubernetes resource mutation requests."""

        raw = {"metadata": {"name": "dashboard"}}

        async def create(self) -> None:
            """Record resource creation."""

            calls.append(("create", None))

        async def patch(self, manifest: object) -> None:
            """Record a drift-repair manifest."""

            calls.append(("patch", manifest))
            if not exists:
                raise NotFoundError("Resource missing")

    # Act
    await apply(cast(APIObject, Resource()))

    # Assert
    assert calls == expected_calls
