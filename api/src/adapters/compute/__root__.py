from __future__ import annotations

from src.env import env
from src.utils.compute import Compute


class Root:
    """Compute adapter root."""

    def __init__(
        self,
        state_path: str = "state.yaml",
        namespace: str = env.COMPUTE_NAMESPACE,
        ingress_name: str = "control-ingress",
        ingress_host: str = "localhost",
    ) -> None:
        """Initialize the compute adapter root."""
        self._compute = Compute(
            state_path=state_path,
            namespace=namespace,
            ingress_name=ingress_name,
            ingress_host=ingress_host,
        )

    def list(self) -> list[str]:
        """List managed compute resources."""
        return self._compute.list()

    def create(self, name: str, image: str) -> list[dict]:
        """Create or replace one compute resource."""
        return self._compute.create(name=name, image=image)

    def delete(self, name: str) -> list[dict]:
        """Delete one compute resource."""
        return self._compute.delete(name=name)

    def apply(self) -> list[dict]:
        """Apply the persisted compute state to the cluster."""
        return self._compute.apply()


root = Root()
