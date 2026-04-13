import src.db as db
from fastapi import HTTPException
from src.router import router
from src.models.computes import (ComputeContainerCreate,
                                 ComputeConnectionCreate,
                                 ComputeConnectionDelete,
                                 ComputeConnectionResponse,
                                 ComputeContainerCreateResponse)
from kubernetes.client.exceptions import ApiException


def _pod_name_from_app_key(app_key: str, container_name: str) -> str:
    app_normalized = ''.join(character for character in app_key.lower() if character.isalnum() or character in {'-', '.'}).strip('-.')
    container_normalized = ''.join(character for character in container_name.lower() if character.isalnum() or character in {'-', '.'}).strip('-.')

    if not app_normalized or not container_normalized:
        raise ValueError('App key and container name must include valid lowercase characters')

    pod_name = f'{app_normalized}-{container_normalized}'
    return pod_name[:63].rstrip('-.')


@router.get('/compute')
async def list_computes() -> list[ComputeConnectionResponse]:
    connections = await db.computes.list()
    return [
        ComputeConnectionResponse(
            name=connection.name,
            api_server_url=connection.api_server_url,
            admin_username=connection.admin_username,
            default_namespace=connection.default_namespace,
            verify_ssl=connection.verify_ssl,
        )
        for connection in connections
    ]


@router.post('/compute')
async def set_compute_connection(payload: ComputeConnectionCreate) -> ComputeConnectionResponse:
    connection = await db.computes.set(
        name=payload.name,
        api_server_url=payload.api_server_url,
        admin_username=payload.admin_username,
        admin_password=payload.admin_password,
        default_namespace=payload.default_namespace,
        verify_ssl=payload.verify_ssl,
    )

    return ComputeConnectionResponse(
        name=connection.name,
        api_server_url=connection.api_server_url,
        admin_username=connection.admin_username,
        default_namespace=connection.default_namespace,
        verify_ssl=connection.verify_ssl,
    )


@router.delete('/compute')
async def delete_compute_connection(payload: ComputeConnectionDelete) -> dict[str, str]:
    deleted = await db.computes.delete(payload.name)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Compute connection '{payload.name}' not found")

    return {'status': 'deleted'}


@router.post('/compute/apps/{app_id}/containers')
async def create_compute_container_for_app(
    app_id: str,
    payload: ComputeContainerCreate,
    connection_name: str = 'default',
) -> ComputeContainerCreateResponse:
    app = await db.apps.get_by_uuid(app_id)
    if app is None:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")

    connection = await db.computes.get(connection_name)
    if connection is None:
        raise HTTPException(status_code=404, detail=f"Compute connection '{connection_name}' not found")

    namespace = payload.namespace or connection.default_namespace

    try:
        pod_name = _pod_name_from_app_key(app.key, payload.container_name)
        await db.computes.create_container(
            connection=connection,
            namespace=namespace,
            pod_name=pod_name,
            image=payload.image,
            command=payload.command,
            args=payload.args,
            env={item.name: item.value for item in payload.env},
            container_port=payload.container_port,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except ApiException as error:
        detail = error.body or str(error)
        raise HTTPException(status_code=502, detail=f'Unable to create container: {detail}') from error

    return ComputeContainerCreateResponse(
        app_id=app.id,
        app_key=app.key,
        connection_name=connection_name,
        namespace=namespace,
        pod_name=pod_name,
        image=payload.image,
    )
