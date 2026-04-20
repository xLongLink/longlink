from __future__ import annotations

import re
import asyncio
from src.env import env
from kubernetes import client, config
from urllib3.exceptions import HTTPError
from kubernetes.client.exceptions import ApiException
from kubernetes.config.config_exception import ConfigException

_NAME_PATTERN = re.compile(r"^[a-z0-9]([-.a-z0-9]{0,61}[a-z0-9])?$")
_ACTIVE_PHASES = {"Pending", "Running"}


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


async def list_active_containers(namespace: str | None = None) -> list[dict[str, object]]:
    """List active Kubernetes pods and their container images."""
    return await asyncio.to_thread(_list_active_containers_sync, namespace)


def _create_sync(
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None,
    args: list[str] | None,
    env_vars: dict[str, str],
    container_port: int | None,
) -> None:
    """Create namespace and pod using Kubernetes API (runs in thread)."""
    # Try the explicit API server configuration first because deployments may
    # provide a dedicated compute endpoint that should take precedence.
    configuration = client.Configuration()
    configuration.host = env.ENV_PROVISION_COMPUTE_API_SERVER_URL
    configuration.username = env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME
    configuration.password = env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD
    configuration.verify_ssl = env.ENV_PROVISION_COMPUTE_VERIFY_SSL

    try:
        with client.ApiClient(configuration) as api_client:
            _create_namespaced_pod(
                api_client=api_client,
                namespace=namespace,
                pod_name=pod_name,
                image=image,
                command=command,
                args=args,
                env_vars=env_vars,
                container_port=container_port,
            )
        return
    except HTTPError:
        pass

    # Fall back to kubeconfig to support local development where the Kubernetes
    # API may be reachable only through kubectl context instead of the proxy URL.
    try:
        config.load_kube_config()
    except ConfigException as error:
        raise ComputeConnectionError("Unable to reach compute API server") from error

    try:
        with client.ApiClient() as api_client:
            _create_namespaced_pod(
                api_client=api_client,
                namespace=namespace,
                pod_name=pod_name,
                image=image,
                command=command,
                args=args,
                env_vars=env_vars,
                container_port=container_port,
            )
    except HTTPError as error:
        raise ComputeConnectionError("Unable to reach compute API server") from error


def _list_active_containers_sync(namespace: str | None) -> list[dict[str, object]]:
    """Collect active pod details from Kubernetes using available connection options."""
    # Try explicit compute endpoint first to honor control-plane configuration.
    configuration = client.Configuration()
    configuration.host = env.ENV_PROVISION_COMPUTE_API_SERVER_URL
    configuration.username = env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME
    configuration.password = env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD
    configuration.verify_ssl = env.ENV_PROVISION_COMPUTE_VERIFY_SSL

    try:
        with client.ApiClient(configuration) as api_client:
            return _list_active_pods(api_client=api_client, namespace=namespace)
    except HTTPError:
        pass

    # Fall back to local kubeconfig to support k3d and other local clusters.
    try:
        config.load_kube_config()
    except ConfigException as error:
        raise ComputeConnectionError("Unable to reach compute API server") from error

    try:
        with client.ApiClient() as api_client:
            return _list_active_pods(api_client=api_client, namespace=namespace)
    except HTTPError as error:
        raise ComputeConnectionError("Unable to reach compute API server") from error


def _list_active_pods(
    *,
    api_client: client.ApiClient,
    namespace: str | None,
) -> list[dict[str, object]]:
    """Return active pods from a namespace or all namespaces for a configured API client."""
    core = client.CoreV1Api(api_client)

    # Query either a specific namespace or all namespaces based on caller input.
    if namespace:
        pod_list = core.list_namespaced_pod(namespace=namespace)
    else:
        pod_list = core.list_pod_for_all_namespaces()

    active_containers: list[dict[str, object]] = []

    # Keep only active phases so terminated workloads are excluded from UI views.
    for pod in pod_list.items:
        pod_phase = pod.status.phase if pod.status and pod.status.phase else "Unknown"
        if pod_phase not in _ACTIVE_PHASES:
            continue

        pod_images = [container.image for container in pod.spec.containers or []]
        active_containers.append(
            {
                "namespace": pod.metadata.namespace or "",
                "pod_name": pod.metadata.name or "",
                "phase": pod_phase,
                "images": pod_images,
            }
        )

    return active_containers


def _create_namespaced_pod(
    *,
    api_client: client.ApiClient,
    namespace: str,
    pod_name: str,
    image: str,
    command: list[str] | None,
    args: list[str] | None,
    env_vars: dict[str, str],
    container_port: int | None,
) -> None:
    """Create namespace and pod using a pre-configured Kubernetes API client."""
    core = client.CoreV1Api(api_client)

    # Create namespace lazily so first app deployment can bootstrap environment.
    try:
        core.read_namespace(name=namespace)
    except ApiException as error:
        if error.status != 404:
            raise
        core.create_namespace(
            body=client.V1Namespace(metadata=client.V1ObjectMeta(name=namespace))
        )

    # Prevent duplicate pod names to keep app key mapping stable.
    try:
        core.read_namespaced_pod(name=pod_name, namespace=namespace)
        raise ValueError(
            f"Container '{pod_name}' already exists in namespace '{namespace}'"
        )
    except ApiException as error:
        if error.status != 404:
            raise

    # Build container and pod specs from request parameters.
    container = client.V1Container(
        name=pod_name,
        image=image,
        command=command,
        args=args,
        env=[client.V1EnvVar(name=name, value=value) for name, value in env_vars.items()],
        ports=[client.V1ContainerPort(container_port=container_port)]
        if container_port
        else None,
    )

    pod = client.V1Pod(
        metadata=client.V1ObjectMeta(name=pod_name, labels={"app": pod_name}),
        spec=client.V1PodSpec(containers=[container], restart_policy="Always"),
    )

    core.create_namespaced_pod(namespace=namespace, body=pod)
