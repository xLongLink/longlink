from __future__ import annotations

import re
import kr8s
import asyncio
from kr8s import (ServerError, NotFoundError, APITimeoutError,
                  ConnectionClosedError)
from src.env import env
from kr8s.objects import Pod, Namespace
from urllib.parse import ParseResult, quote, urlparse

_NAME_PATTERN = re.compile(r"^[a-z0-9]([-.a-z0-9]{0,61}[a-z0-9])?$")


class ComputeConnectionError(RuntimeError):
    """Raised when the control plane cannot connect to the compute API."""


async def create(
    *,
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None,
    args: list[str] | None,
    env_vars: dict[str, str],
    container_port: int | None,
) -> None:
    """Create a Kubernetes pod in the specified namespace."""
    if not _NAME_PATTERN.fullmatch(namespace):
        raise ValueError(
            "Namespace must contain only lowercase letters, numbers, dots and dashes"
        )

    if not _NAME_PATTERN.fullmatch(pod_name):
        raise ValueError(
            "Container name must contain only lowercase letters, numbers, dots and dashes"
        )

    await asyncio.to_thread(
        _create_sync,
        namespace,
        pod_name,
        image,
        command,
        args,
        env_vars,
        container_port,
    )


def _create_sync(
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None,
    args: list[str] | None,
    env_vars: dict[str, str],
    container_port: int | None,
) -> None:
    """Create namespace and pod using Kubernetes API."""
    # Try the explicit API server configuration first because deployments may
    # provide a dedicated compute endpoint that should take precedence.
    compute_api_server_url = _build_authenticated_compute_url(
        api_server_url=env.ENV_PROVISION_COMPUTE_API_SERVER_URL,
        username=env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME,
        password=env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD,
    )

    try:
        _create_namespaced_pod(
            api=kr8s.api(url=compute_api_server_url),
            namespace=namespace,
            pod_name=pod_name,
            image=image,
            command=command,
            args=args,
            env_vars=env_vars,
            container_port=container_port,
        )
        return
    except (APITimeoutError, ConnectionClosedError, OSError, ServerError):
        pass

    # Fall back to kubeconfig to support local development where the Kubernetes
    # API may be reachable only through kubectl context instead of the proxy URL.
    try:
        _create_namespaced_pod(
            api=kr8s.api(),
            namespace=namespace,
            pod_name=pod_name,
            image=image,
            command=command,
            args=args,
            env_vars=env_vars,
            container_port=container_port,
        )
    except (APITimeoutError, ConnectionClosedError, OSError, ServerError) as error:
        raise ComputeConnectionError("Unable to reach compute API server") from error


def _create_namespaced_pod(
    *,
    api: kr8s.Api,
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None,
    args: list[str] | None,
    env_vars: dict[str, str],
    container_port: int | None,
) -> None:
    """Create namespace and pod using a pre-configured Kubernetes API client."""

    # Create namespace lazily so first app deployment can bootstrap environment.
    if not _resource_exists(kind="namespaces", name=namespace, api=api):
        Namespace({"metadata": {"name": namespace}}, api=api).create()

    # Prevent duplicate pod names to keep app key mapping stable.
    if _resource_exists(kind="pods", name=pod_name, namespace=namespace, api=api):
        raise ValueError(
            f"Container '{pod_name}' already exists in namespace '{namespace}'"
        )

    # Build container and pod specs from request parameters.
    container_spec: dict[str, object] = {
        "name": pod_name,
        "image": image,
        "env": [{"name": name, "value": value} for name, value in env_vars.items()],
    }
    if command:
        container_spec["command"] = command
    if args:
        container_spec["args"] = args
    if container_port:
        container_spec["ports"] = [{"containerPort": container_port}]

    pod = Pod(
        {
            "metadata": {"name": pod_name, "labels": {"app": pod_name}},
            "spec": {"containers": [container_spec], "restartPolicy": "Always"},
        },
        namespace=namespace,
        api=api,
    )
    pod.create()


def _resource_exists(
    *,
    kind: str,
    name: str,
    namespace: str | None = None,
    api: kr8s.Api,
) -> bool:
    """Check whether a Kubernetes resource exists."""
    try:
        return any(kr8s.get(kind, name, namespace=namespace, api=api))
    except NotFoundError:
        return False


def _build_authenticated_compute_url(
    *,
    api_server_url: str,
    username: str,
    password: str,
) -> str:
    """Build API server URL with basic-auth credentials."""
    parsed_url = urlparse(api_server_url)
    encoded_username = quote(username, safe="")
    encoded_password = quote(password, safe="")
    authenticated_netloc = (
        f"{encoded_username}:{encoded_password}@{parsed_url.hostname or ''}"
    )
    if parsed_url.port is not None:
        authenticated_netloc = f"{authenticated_netloc}:{parsed_url.port}"

    return ParseResult(
        scheme=parsed_url.scheme,
        netloc=authenticated_netloc,
        path=parsed_url.path,
        params=parsed_url.params,
        query=parsed_url.query,
        fragment=parsed_url.fragment,
    ).geturl()
