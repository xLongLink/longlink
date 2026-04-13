import pytest
from src.db.models.computes import ComputeConnection
from src.db.services.computes import ComputesService


@pytest.mark.integration
async def test_create_container_rejects_invalid_namespace() -> None:
    connection = ComputeConnection(
        name='default',
        api_server_url='http://127.0.0.1:65535',
        admin_username='admin',
        admin_password='admin',
        default_namespace='default',
        verify_ssl=False,
    )

    with pytest.raises(ValueError, match='Namespace must contain only lowercase letters, numbers, dots and dashes'):
        await ComputesService().create_container(
            connection=connection,
            namespace='INVALID_NAMESPACE',
            pod_name='demo',
            image='nginx:latest',
            command=None,
            args=None,
            env={},
            container_port=None,
        )
