import pytest
from src.utils import compute


@pytest.mark.unit
@pytest.mark.asyncio
async def test_create_rejects_invalid_namespace():
    """Compute create helper should reject non-kubernetes-compliant namespace names."""

    with pytest.raises(ValueError, match="Namespace must contain only lowercase letters"):
        await compute.create(
            namespace="Invalid Namespace",
            pod_name="valid-pod",
            image="busybox:latest",
            command=["sleep"],
            args=["5"],
            env_vars={},
            container_port=None,
        )
