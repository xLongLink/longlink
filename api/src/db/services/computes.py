from __future__ import annotations

import re
import asyncio
from src.env import env
from kubernetes import client
from dataclasses import dataclass
from kubernetes.client.exceptions import ApiException

_NAME_PATTERN = re.compile(r'^[a-z0-9]([-.a-z0-9]{0,61}[a-z0-9])?$')


@dataclass
class ComputeProvisionConfig:
    api_server_url: str
    admin_username: str
    admin_password: str
    default_namespace: str
    verify_ssl: bool


@dataclass
class ComputeUsage:
    running_pods: int
    namespaces: int
    free_bytes: int | None


class ComputesService:
    def get_config(self) -> ComputeProvisionConfig:
        if not env.ENV_PROVISION_COMPUTE_API_SERVER_URL:
            raise ValueError('ENV_PROVISION_COMPUTE_API_SERVER_URL is not configured')
        if not env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME:
            raise ValueError('ENV_PROVISION_COMPUTE_ADMIN_USERNAME is not configured')
        if not env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD:
            raise ValueError('ENV_PROVISION_COMPUTE_ADMIN_PASSWORD is not configured')

        return ComputeProvisionConfig(
            api_server_url=env.ENV_PROVISION_COMPUTE_API_SERVER_URL,
            admin_username=env.ENV_PROVISION_COMPUTE_ADMIN_USERNAME,
            admin_password=env.ENV_PROVISION_COMPUTE_ADMIN_PASSWORD,
            default_namespace=env.ENV_PROVISION_COMPUTE_DEFAULT_NAMESPACE,
            verify_ssl=env.ENV_PROVISION_COMPUTE_VERIFY_SSL,
        )

    async def usage(self) -> ComputeUsage:
        config = self.get_config()
        return await asyncio.to_thread(self._usage_sync, config)

    async def create_container(
        self,
        *,
        namespace: str,
        pod_name: str,
        image: str,
        command: list[str] | None,
        args: list[str] | None,
        env: dict[str, str],
        container_port: int | None,
    ) -> None:
        if not _NAME_PATTERN.fullmatch(namespace):
            raise ValueError('Namespace must contain only lowercase letters, numbers, dots and dashes')

        if not _NAME_PATTERN.fullmatch(pod_name):
            raise ValueError('Container name must contain only lowercase letters, numbers, dots and dashes')

        config = self.get_config()
        await asyncio.to_thread(
            self._create_container_sync,
            config,
            namespace,
            pod_name,
            image,
            command,
            args,
            env,
            container_port,
        )

    @staticmethod
    def _client(config: ComputeProvisionConfig) -> client.CoreV1Api:
        configuration = client.Configuration()
        configuration.host = config.api_server_url
        configuration.username = config.admin_username
        configuration.password = config.admin_password
        configuration.verify_ssl = config.verify_ssl

        return client.CoreV1Api(client.ApiClient(configuration))

    @staticmethod
    def _usage_sync(config: ComputeProvisionConfig) -> ComputeUsage:
        core = ComputesService._client(config)
        namespaces = core.list_namespace().items
        pods = core.list_pod_for_all_namespaces().items
        running_pods = len([pod for pod in pods if pod.status and pod.status.phase == 'Running'])
        return ComputeUsage(running_pods=running_pods, namespaces=len(namespaces), free_bytes=None)

    @staticmethod
    def _create_container_sync(
        config: ComputeProvisionConfig,
        namespace: str,
        pod_name: str,
        image: str,
        command: list[str] | None,
        args: list[str] | None,
        env: dict[str, str],
        container_port: int | None,
    ) -> None:
        configuration = client.Configuration()
        configuration.host = config.api_server_url
        configuration.username = config.admin_username
        configuration.password = config.admin_password
        configuration.verify_ssl = config.verify_ssl

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
                env=[client.V1EnvVar(name=name, value=value) for name, value in env.items()],
                ports=[client.V1ContainerPort(container_port=container_port)] if container_port else None,
            )

            pod = client.V1Pod(
                metadata=client.V1ObjectMeta(name=pod_name, labels={'app': pod_name}),
                spec=client.V1PodSpec(containers=[container], restart_policy='Always'),
            )

            core.create_namespaced_pod(namespace=namespace, body=pod)
