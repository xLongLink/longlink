from __future__ import annotations

import re
import asyncio
from src.env import env
from kubernetes import client
from kubernetes.client.exceptions import ApiException

_NAME_PATTERN = re.compile(r'^[a-z0-9]([-.a-z0-9]{0,61}[a-z0-9])?$')


class ComputesService:
    async def create_container(
        self,
        *,
        namespace: str,
        pod_name: str,
        image: str,
        command: list[str] | None,
        args: list[str] | None,
        env_vars: dict[str, str],
        container_port: int | None,
    ) -> None:
        if not _NAME_PATTERN.fullmatch(namespace):
            raise ValueError('Namespace must contain only lowercase letters, numbers, dots and dashes')

        if not _NAME_PATTERN.fullmatch(pod_name):
            raise ValueError('Container name must contain only lowercase letters, numbers, dots and dashes')

        await asyncio.to_thread(
            self._create_container_sync,
            namespace,
            pod_name,
            image,
            command,
            args,
            env_vars,
            container_port,
        )

    @staticmethod
    def _create_container_sync(
        namespace: str,
        pod_name: str,
        image: str,
        command: list[str] | None,
        args: list[str] | None,
        env_vars: dict[str, str],
        container_port: int | None,
    ) -> None:
        configuration = client.Configuration()
        configuration.host = env.ENV_PROVISION_COMPUTE_API_SERVER_URL
        configuration.username = env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME
        configuration.password = env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD
        configuration.verify_ssl = env.ENV_PROVISION_COMPUTE_VERIFY_SSL

        with client.ApiClient(configuration) as api_client:
            core = client.CoreV1Api(api_client)

            try:
                core.read_namespace(name=namespace)
            except ApiException as error:
                if error.status != 404:
                    raise
                core.create_namespace(
                    body=client.V1Namespace(metadata=client.V1ObjectMeta(name=namespace))
                )

            try:
                core.read_namespaced_pod(name=pod_name, namespace=namespace)
                raise ValueError(f"Container '{pod_name}' already exists in namespace '{namespace}'")
            except ApiException as error:
                if error.status != 404:
                    raise

            container = client.V1Container(
                name=pod_name,
                image=image,
                command=command,
                args=args,
                env=[client.V1EnvVar(name=name, value=value) for name, value in env_vars.items()],
                ports=[client.V1ContainerPort(container_port=container_port)] if container_port else None,
            )

            pod = client.V1Pod(
                metadata=client.V1ObjectMeta(name=pod_name, labels={'app': pod_name}),
                spec=client.V1PodSpec(containers=[container], restart_policy='Always'),
            )

            core.create_namespaced_pod(namespace=namespace, body=pod)
