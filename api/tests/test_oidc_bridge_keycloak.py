import os
import sys
import uuid
import httpx
import pytest
import importlib
from httpx import ASGITransport
from pathlib import Path

KEYCLOAK_BASE_URL = 'http://127.0.0.1:18080'

async def _admin_token(client: httpx.AsyncClient, base_url: str) -> str:
    response = await client.post(
        f'{base_url}/realms/master/protocol/openid-connect/token',
        data={
            'grant_type': 'password',
            'client_id': 'admin-cli',
            'username': 'admin',
            'password': 'admin',
        },
    )
    response.raise_for_status()
    return response.json()['access_token']


async def _setup_realm(
    client: httpx.AsyncClient,
    base_url: str,
    realm: str,
    client_id: str,
    client_secret: str,
) -> None:
    token = await _admin_token(client, base_url)
    headers = {'Authorization': f'Bearer {token}'}

    realm_response = await client.post(
        f'{base_url}/admin/realms',
        headers=headers,
        json={'realm': realm, 'enabled': True},
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
    client_response = await client.post(
        f'{base_url}/admin/realms/{realm}/clients',
        headers=headers,
        json=client_payload,
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
async def test_pure_oidc_bridge_with_dedicated_control_plane_realm(tmp_path: Path) -> None:
    realm = f'longlink-control-plane-{uuid.uuid4().hex[:8]}'
    client_id = 'longlink-api'
    client_secret = 'longlink-secret'

    try:
        async with httpx.AsyncClient(timeout=10.0) as keycloak_client:
            await _setup_realm(keycloak_client, KEYCLOAK_BASE_URL, realm, client_id, client_secret)

        issuer = f'{KEYCLOAK_BASE_URL}/realms/{realm}'
        app = _load_app_with_oidc(tmp_path / 'oidc.db', issuer, client_id, client_secret)

        async with httpx.AsyncClient(
            transport=ASGITransport(app=app),
            base_url='http://testserver',
        ) as client:
            methods = await client.get('/login')
            assert methods.status_code == 200
            assert methods.json() == ['oidc']

            login_redirect = await client.get('/login/oidc', follow_redirects=False)
            assert login_redirect.status_code in (302, 307)
            redirect_location = login_redirect.headers['location']
            assert f'/realms/{realm}/protocol/openid-connect/auth' in redirect_location
            assert f'client_id={client_id}' in redirect_location
    except httpx.HTTPError as exc:  # pragma: no cover - integration env dependent
        pytest.skip(f'Local Keycloak integration is unavailable: {exc}')
