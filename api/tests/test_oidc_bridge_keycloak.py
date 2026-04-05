import os
import sys
import time
import uuid
import httpx
import pytest
import importlib
from pathlib import Path
from docker.errors import DockerException
from fastapi.testclient import TestClient
from testcontainers.core.container import DockerContainer


def _wait_for_keycloak_ready(base_url: str, timeout_seconds: int = 90) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            response = httpx.get(f'{base_url}/realms/master/.well-known/openid-configuration', timeout=2.0)
            if response.status_code == 200:
                return
        except httpx.HTTPError:
            pass
        time.sleep(1)

    raise TimeoutError('Keycloak did not become ready in time.')


def _admin_token(base_url: str) -> str:
    response = httpx.post(
        f'{base_url}/realms/master/protocol/openid-connect/token',
        data={
            'grant_type': 'password',
            'client_id': 'admin-cli',
            'username': 'admin',
            'password': 'admin',
        },
        timeout=10.0,
    )
    response.raise_for_status()
    return response.json()['access_token']


def _setup_realm(base_url: str, realm: str, client_id: str, client_secret: str) -> None:
    token = _admin_token(base_url)
    headers = {'Authorization': f'Bearer {token}'}

    realm_response = httpx.post(
        f'{base_url}/admin/realms',
        headers=headers,
        json={'realm': realm, 'enabled': True},
        timeout=10.0,
    )
    if realm_response.status_code not in (201, 409):
        realm_response.raise_for_status()

    client_payload = {
        'clientId': client_id,
        'enabled': True,
        'protocol': 'openid-connect',
        'publicClient': False,
        'secret': client_secret,
        'standardFlowEnabled': True,
        'directAccessGrantsEnabled': True,
        'redirectUris': [
            'http://localhost:8000/auth/oidc',
            'http://testserver/auth/oidc',
        ],
        'webOrigins': ['*'],
    }
    client_response = httpx.post(
        f'{base_url}/admin/realms/{realm}/clients',
        headers=headers,
        json=client_payload,
        timeout=10.0,
    )
    if client_response.status_code not in (201, 409):
        client_response.raise_for_status()


def _load_app_with_oidc(db_path: Path, issuer: str, client_id: str, client_secret: str):
    os.environ['DEV'] = 'true'
    os.environ['ENV_DATABASE_URL'] = f'sqlite+aiosqlite:///{db_path}'
    os.environ['ENV_OIDC_ISSUER'] = issuer
    os.environ['ENV_OIDC_CLIENT_ID'] = client_id
    os.environ['ENV_OIDC_CLIENT_SECRET'] = client_secret
    os.environ['ENV_OIDC_REDIRECT_URI'] = 'http://testserver/auth/oidc'

    for module_name in ('main', 'src.auth', 'src.env', 'src.routes.auth'):
        if module_name in sys.modules:
            del sys.modules[module_name]

    module = importlib.import_module('main')
    return module.app


@pytest.mark.integration
def test_pure_oidc_bridge_with_dedicated_control_plane_realm(tmp_path: Path) -> None:
    realm = f'longlink-control-plane-{uuid.uuid4().hex[:8]}'
    client_id = 'longlink-api'
    client_secret = 'longlink-secret'

    try:
        container = DockerContainer('quay.io/keycloak/keycloak:26.1')
        container.with_env('KEYCLOAK_ADMIN', 'admin')
        container.with_env('KEYCLOAK_ADMIN_PASSWORD', 'admin')
        container.with_exposed_ports(8080)
        container.with_command('start-dev --http-port=8080')

        with container:
            host = container.get_container_host_ip()
            port = container.get_exposed_port(8080)
            base_url = f'http://{host}:{port}'

            _wait_for_keycloak_ready(base_url)
            _setup_realm(base_url, realm, client_id, client_secret)

            issuer = f'{base_url}/realms/{realm}'
            app = _load_app_with_oidc(tmp_path / 'oidc.db', issuer, client_id, client_secret)

            with TestClient(app) as client:
                methods = client.get('/login')
                assert methods.status_code == 200
                assert methods.json() == ['oidc']

                login_redirect = client.get('/login/oidc', follow_redirects=False)
                assert login_redirect.status_code in (302, 307)
                redirect_location = login_redirect.headers['location']
                assert f'/realms/{realm}/protocol/openid-connect/auth' in redirect_location
                assert f'client_id={client_id}' in redirect_location
    except DockerException as exc:  # pragma: no cover - integration env dependent
        pytest.skip(f'Keycloak integration requires a running docker daemon: {exc}')
