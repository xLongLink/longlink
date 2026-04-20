from __future__ import annotations

import asyncio
import kr8s.asyncio as kr8s_asyncio
from src.env import env
from urllib.parse import ParseResult, quote, urlparse
from kr8s.asyncio.objects import Pod, Service, Namespace


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
) -> str:
    """Create a namespaced pod and service, then return in-cluster service URL."""
    # Build an authenticated URL so the compute API can be reached by admin credentials.
    compute_api_server_url = _build_authenticated_compute_url(
        api_server_url=env.ENV_PROVISION_COMPUTE_API_SERVER_URL,
        username=env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME,
        password=env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD,
    )

    try:
        api = await kr8s_asyncio.api(url=compute_api_server_url)
    except Exception as exc:  # pragma: no cover - depends on runtime connectivity.
        raise ComputeConnectionError("Failed to connect to compute API") from exc

    return await _create_namespaced_pod(
        api=api,
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
) -> str:
    """Create namespace, pod, and service, then return in-cluster DNS URL."""
    if container_port is None:
        raise ValueError("container_port is required to expose the app service")

    # Ensure namespace exists before creating the pod.
    namespace_obj = await Namespace({"metadata": {"name": namespace}}, api=api)
    try:
        await namespace_obj.create()
    except Exception:
        # Namespace might already exist and is safe to ignore.
        pass

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

    # Wait until the pod is healthy before creating or reusing the service.
    await pod.wait("condition=Ready", timeout=60)

    service = await Service(
        {
            "metadata": {"name": pod_name},
            "spec": {
                "selector": {"app": pod_name},
                "ports": [
                    {
                        "protocol": "TCP",
                        "port": container_port,
                        "targetPort": container_port,
                    }
                ],
                "type": "ClusterIP",
            },
        },
        namespace=namespace,
        api=api,
    )

    try:
        await service.create()
    except Exception:
        # Service may already exist for this app name.
        pass

    return f"http://{pod_name}.{namespace}.svc.cluster.local:{container_port}"


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


async def _example_main() -> None:
    """Run a sample deployment with explicit values requested by the task."""
    url = await create(
        namespace="default",
        pod_name="sampleapp",
        image="localhost:5000/sampleapp:20260419_185022",
        command=None,
        args=None,
        env_vars={},
        container_port=8000,
    )
    print(url)


if __name__ == "__main__":
    asyncio.run(_example_main())
