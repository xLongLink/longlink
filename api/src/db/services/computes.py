from src.utils import compute


class ComputesService:
    """Service for managing compute resources (containers)."""

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
        """Create a new container workload in the configured compute cluster."""
        await compute.create(
            namespace=namespace,
            pod_name=pod_name,
            image=image,
            command=command,
            args=args,
            env_vars=env_vars,
            container_port=container_port,
        )

    async def list_active_containers(
        self, *, namespace: str | None = None
    ) -> list[dict[str, object]]:
        """List active containers from the compute cluster."""
        return await compute.list_active_containers(namespace=namespace)
