<div align="center">
<img src="../web/public/banner.png" width="50%" />
<p style="font-size: 1.5em;">Control Panel</p>
</div>

## Features

- Core login of the Application.
- Handle authentication, and routing to modules.

<br />

## Development

```bash
uv venv .venv
```

Install the API in editable mode with development dependencies:

```bash
uv pip install --python .venv/bin/python -e './api[dev]'
```

## Local development

Run the API server without reload/watch mode:

```bash
cd api
../.venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

## OIDC bridge environment variables

The API uses a pure OIDC bridge based on Authlib and expects these variables:

- `ENV_OIDC_ISSUER` (example: `http://localhost:8080/realms/dev`)
- `ENV_OIDC_CLIENT_ID`
- `ENV_OIDC_CLIENT_SECRET`
- `ENV_OIDC_REDIRECT_URI` (default: `http://localhost:8000/auth/oidc`)
- `ENV_OIDC_SCOPES` (default: `openid profile email`)

### Local development defaults (Keycloak)

Copy `api/.env.sample` to `api/.env` and adjust values as needed for your local setup.

`dev/compose.yml` imports a development `dev` realm automatically on startup,
including the `longlink-api` client and `longlink-secret` credentials.
