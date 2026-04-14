from src.utils import compute


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
        await compute.create(
            namespace=namespace,
            pod_name=pod_name,
            image=image,
            command=command,
            args=args,
            env_vars=env_vars,
            container_port=container_port,
        )
