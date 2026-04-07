import re
import asyncio
from kubernetes import client
from sqlalchemy import select
from src.db.models import ComputeConnection
from src.db.session import get_session
from kubernetes.client.exceptions import ApiException

_NAME_PATTERN = re.compile(r'^[a-z0-9]([-.a-z0-9]{0,61}[a-z0-9])?$')


class ComputesService:
    async def list(self) -> list[ComputeConnection]:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(ComputeConnection))
            return list(result.scalars().all())

    async def get(self, name: str) -> ComputeConnection | None:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(ComputeConnection).where(ComputeConnection.name == name))
            return result.scalar_one_or_none()

    async def set(
        self,
        *,
        name: str,
        api_server_url: str,
        admin_username: str,
        admin_password: str,
        default_namespace: str,
        verify_ssl: bool,
    ) -> ComputeConnection:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(ComputeConnection).where(ComputeConnection.name == name))
            connection = result.scalar_one_or_none()

            if connection is None:
                connection = ComputeConnection(
                    name=name,
                    api_server_url=api_server_url,
                    admin_username=admin_username,
                    admin_password=admin_password,
                    default_namespace=default_namespace,
                    verify_ssl=verify_ssl,
                )
                session.add(connection)
            else:
                connection.api_server_url = api_server_url
                connection.admin_username = admin_username
                connection.admin_password = admin_password
                connection.default_namespace = default_namespace
                connection.verify_ssl = verify_ssl

            await session.commit()
            await session.refresh(connection)
            return connection

    async def delete(self, name: str) -> bool:
        Session = await get_session()
        async with Session() as session:
            result = await session.execute(select(ComputeConnection).where(ComputeConnection.name == name))
            connection = result.scalar_one_or_none()
            if connection is None:
                return False

            await session.delete(connection)
            await session.commit()
            return True

    async def create_container(
        self,
        *,
        connection: ComputeConnection,
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

        await asyncio.to_thread(
            self._create_container_sync,
            connection,
            namespace,
            pod_name,
            image,
            command,
            args,
            env,
            container_port,
        )

    @staticmethod
    def _create_container_sync(
        connection: ComputeConnection,
        namespace: str,
        pod_name: str,
        image: str,
        command: list[str] | None,
        args: list[str] | None,
        env: dict[str, str],
        container_port: int | None,
    ) -> None:
        configuration = client.Configuration()
        configuration.host = connection.api_server_url
        configuration.username = connection.admin_username
        configuration.password = connection.admin_password
        configuration.verify_ssl = connection.verify_ssl

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
