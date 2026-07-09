from datetime import UTC, datetime
from typing import cast

import pytest

from src.compute.resources import KubernetesResources, parse_kubernetes_timestamp
from src.compute.library import APIObject


pytestmark = pytest.mark.no_db


def test_parse_kubernetes_timestamp_normalizes_supported_values() -> None:
    """Parse Kubernetes timestamps while preserving invalid input as absent."""

    naive = datetime(2026, 7, 9, 12, 30)

    assert parse_kubernetes_timestamp(None) is None
    assert parse_kubernetes_timestamp("") is None
    assert parse_kubernetes_timestamp(naive) == naive.replace(tzinfo=UTC)
    assert parse_kubernetes_timestamp("2026-07-09T12:30:00Z") == datetime(2026, 7, 9, 12, 30, tzinfo=UTC)


def test_kubernetes_not_found_recognizes_response_status() -> None:
    """Recognize generic Kubernetes 404 errors as missing resources."""

    resources = KubernetesResources("{}", "secret", "apps.example.test")


    class Response:
        """Expose an HTTP status code like kr8s responses."""

        status_code = 404


    class Error(Exception):
        """Expose a response object like kr8s server errors."""

        response = Response()

    assert resources._not_found(Error())
    assert not resources._not_found(RuntimeError("boom"))


def test_kubernetes_validate_managed_namespace_rejects_unmanaged_namespace() -> None:
    """Reject namespaces that are not marked as managed by LongLink."""

    resources = KubernetesResources("{}", "secret", "apps.example.test")


    class NamespaceObject:
        """Expose metadata in the shape returned by kr8s resources."""

        metadata = {"labels": {"managed-by": "external"}}

    with pytest.raises(ValueError, match="not managed by LongLink"):
        resources._validate_managed_namespace("default", cast(APIObject, NamespaceObject()))
