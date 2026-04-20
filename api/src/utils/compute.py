from __future__ import annotations

import kr8s.asyncio as kr8s_asyncio
from src.env import env
from urllib.parse import ParseResult, quote, urlparse
from kr8s.asyncio.objects import Pod, Namespace


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
    # Try the explicit API server configuration first because deployments may
    # provide a dedicated compute endpoint that should take precedence.
    compute_api_server_url = _build_authenticated_compute_url(
        api_server_url=env.ENV_PROVISION_COMPUTE_API_SERVER_URL,
        username=env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME,
        password=env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD,
    )

    await _create_namespaced_pod(
        api=await kr8s_asyncio.api(url=compute_api_server_url),
        namespace=namespace,
        pod_name=pod_name,
        image=image,
        command=command,
        args=args,
        env_vars=env_vars,
        container_port=container_port,
    )


async def _create_namespaced_pod(
    *,
    api: kr8s_asyncio.Api,
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None,
    args: list[str] | None,
    env_vars: dict[str, str],
    container_port: int | None,
) -> None:
    """Create namespace and pod using a pre-configured Kubernetes API client."""

    namespace_obj = await Namespace({"metadata": {"name": namespace}}, api=api)
    await namespace_obj.create()

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

    pod = await Pod(
        {
            "metadata": {"name": pod_name, "labels": {"app": pod_name}},
            "spec": {"containers": [container_spec], "restartPolicy": "Always"},
        },
        namespace=namespace,
        api=api,
    )
    await pod.create()


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
