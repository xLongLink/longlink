import pytest
from src.kubernetes import resources

pytestmark = pytest.mark.no_db


def test_comparable_secret_normalizes_string_data_and_server_metadata() -> None:
    """Normalize Secret data before exact replacement comparisons."""

    # Arrange
    body = {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {
            "name": "runtime",
            "namespace": "acme",
            "resourceVersion": "123",
            "uid": "server-uid",
            "annotations": {},
            "labels": {"app": "dashboard"},
        },
        "status": {"ignored": True},
        "stringData": {"TOKEN": "secret"},
    }

    # Act
    comparable = resources._comparable_secret(body)

    # Assert
    assert comparable == {
        "apiVersion": "v1",
        "kind": "Secret",
        "metadata": {"name": "runtime", "namespace": "acme", "labels": {"app": "dashboard"}},
        "data": {"TOKEN": "c2VjcmV0"},
        "type": "Opaque",
    }


@pytest.mark.parametrize(
    ("body", "message"),
    [
        ({"kind": "Secret", "metadata": {"name": "runtime"}}, "apiVersion"),
        ({"apiVersion": "v1", "metadata": {"name": "runtime"}}, "kind"),
        ({"apiVersion": "v1", "kind": "Secret", "metadata": []}, "metadata"),
        ({"apiVersion": "v1", "kind": "Secret", "metadata": {}}, "metadata.name"),
    ],
)
def test_resource_from_body_rejects_incomplete_manifest_identity(body: dict[str, object], message: str) -> None:
    """Reject incomplete Kubernetes manifests before constructing API resources."""

    # Act and assert
    with pytest.raises(ValueError, match=message):
        resources._resource_from_body(body, api=None)  # type: ignore[arg-type]


def test_comparable_secret_rejects_invalid_string_data() -> None:
    """Reject Secret stringData that cannot be encoded as string values."""

    # Arrange
    body = {"metadata": {"name": "runtime"}, "stringData": {"TOKEN": object()}}

    # Act and assert
    with pytest.raises(ValueError, match="stringData"):
        resources._comparable_secret(body)
