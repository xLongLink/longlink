import re
import httpx
import hashlib
from src.compute.__root__ import Compute


class Podman(Compute):
    def __init__(
        self,
        *,
        host: str = 'localhost',
        port: int = 8080,
        use_tls: bool = False,
        unix_socket: str | None = '/run/podman/podman.sock',
        network: str | None = None,
    ):
        self.host = host
        self.port = port
        self.use_tls = use_tls
        self.unix_socket = unix_socket
        self.network = network

    @property
    def control_plane_url(self) -> str:
        if self.unix_socket:
            return f'unix://{self.unix_socket}'

        scheme = 'https' if self.use_tls else 'http'
        return f'{scheme}://{self.host}:{self.port}'

    def create(self, app_id: str) -> str:
        return self._container_name(app_id)

    def deploy(self, app_id: str, image: str) -> str:
        container_name = self._container_name(app_id)

        with self._client() as client:
            self._delete_existing_container(client, container_name)

            payload = {
                'image': image,
                'name': container_name,
                'labels': {
                    'longlink.app_id': app_id,
                    'longlink.managed': 'true',
                },
            }
            if self.network:
                payload['networks'] = [self.network]

            response = client.post('/libpod/containers/create', json=payload)
            response.raise_for_status()
            container_id = response.json()['Id']

            start_response = client.post(f'/libpod/containers/{container_id}/start')
            start_response.raise_for_status()

        return container_id

    def delete(self, app_id: str) -> None:
        container_name = self._container_name(app_id)

        with self._client() as client:
            self._delete_existing_container(client, container_name)

    def credentials(self, app_id: str) -> dict[str, str | int]:
        return {
            'type': 'podman',
            'host': self.host,
            'port': self.port,
            'control_plane_url': self.control_plane_url,
            'container_name': self._container_name(app_id),
        }

    def _container_name(self, app_id: str) -> str:
        safe = re.sub(r'[^a-zA-Z0-9_.-]+', '-', app_id).strip('-').lower()
        if not safe:
            safe = 'app'

        digest = hashlib.sha1(app_id.encode()).hexdigest()[:8]
        prefix = f'll-{safe}'

        if len(prefix) > 54:
            prefix = prefix[:54].rstrip('-')

        return f'{prefix}-{digest}'

    def _client(self) -> httpx.Client:
        if self.unix_socket:
            transport = httpx.HTTPTransport(uds=self.unix_socket)
            return httpx.Client(base_url='http://localhost/v5.0.0', transport=transport, timeout=30)

        return httpx.Client(base_url=f'{self.control_plane_url}/v5.0.0', timeout=30)

    def _delete_existing_container(self, client: httpx.Client, container_name: str) -> None:
        response = client.get(f'/libpod/containers/{container_name}/json')
        if response.status_code == 404:
            return
        response.raise_for_status()

        delete_response = client.delete(f'/libpod/containers/{container_name}?force=true')
        delete_response.raise_for_status()
