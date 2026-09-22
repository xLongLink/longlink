import pytest
from typing import cast
from src.kubernetes import storageclasses
from src.kubernetes.client import Kubernetes

pytestmark = pytest.mark.no_db


class StorageClass:
    """Expose the metadata consumed from one Kubernetes StorageClass."""

    def __init__(self, name: str, *, default: bool = False) -> None:
        """Build one StorageClass observation."""

        annotations = {storageclasses.DEFAULT_CLASS_ANNOTATION: "true"} if default else {}
        self.metadata = {"name": name, "annotations": annotations}


class TestKubernetes:
    """Provide the API shape required by StorageClass discovery."""

    async def api(self) -> object:
        """Return the fake Kubernetes API client."""

        return object()


@pytest.mark.parametrize(
    ("classes", "expected"),
    [
        pytest.param([StorageClass("local-path")], "local-path", id="sole-class"),
        pytest.param([StorageClass("retain"), StorageClass("delete", default=True)], "delete", id="default-class"),
    ],
)
async def test_resolve_selects_unique_storage_class(
    monkeypatch: pytest.MonkeyPatch, classes: list[StorageClass], expected: str
) -> None:
    """Select the sole class or the default class from an unambiguous cluster."""

    # Arrange
    async def listed_classes(**_kwargs: object):
        """Yield the available cluster StorageClasses."""

        for storage_class in classes:
            yield storage_class

    monkeypatch.setattr(storageclasses.StorageClassResource, "list", listed_classes)

    # Act and assert
    assert await storageclasses.resolve(cast(Kubernetes, TestKubernetes())) == expected


@pytest.mark.parametrize(
    ("classes", "message"),
    [
        pytest.param([], "no storage classes", id="none"),
        pytest.param([StorageClass("retain"), StorageClass("delete")], "without a default", id="ambiguous"),
        pytest.param(
            [StorageClass("retain", default=True), StorageClass("delete", default=True)],
            "multiple default",
            id="multiple-defaults",
        ),
    ],
)
async def test_resolve_rejects_ambiguous_storage_classes(
    monkeypatch: pytest.MonkeyPatch, classes: list[StorageClass], message: str
) -> None:
    """Reject clusters without a unique StorageClass selection."""

    # Arrange
    async def listed_classes_with_values(**_kwargs: object):
        """Yield the available cluster StorageClasses."""

        for storage_class in classes:
            yield storage_class

    monkeypatch.setattr(storageclasses.StorageClassResource, "list", listed_classes_with_values)

    # Act and assert
    with pytest.raises(ValueError, match=message):
        await storageclasses.resolve(cast(Kubernetes, TestKubernetes()))
