import pytest
from src.runtime.kubernetes import Kubernetes

pytestmark = pytest.mark.no_db


def test_kubernetes_not_found_recognizes_response_status() -> None:
    """Recognize generic Kubernetes 404 errors as missing resources."""

    resources = Kubernetes("{}", "secret")

    class Response:
        """Expose an HTTP status code like kr8s responses."""

        status_code = 404

    class Error(Exception):
        """Expose a response object like kr8s server errors."""

        response = Response()

    assert resources._not_found(Error())
    assert not resources._not_found(RuntimeError("boom"))
