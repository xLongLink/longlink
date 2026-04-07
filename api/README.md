# ViaVai API

- Core login of the Application.
- Handle authentication, and routing to modules.

## Development setup

```bash
pip install -e '.[dev]'
```

## OIDC bridge environment variables

The API uses a pure OIDC bridge based on Authlib and expects these variables:

- `ENV_OIDC_ISSUER` (example: `http://localhost:8080/realms/longlink-control-plane`)
- `ENV_OIDC_CLIENT_ID`
- `ENV_OIDC_CLIENT_SECRET`
- `ENV_OIDC_REDIRECT_URI` (default: `http://localhost:8000/auth/oidc`)
- `ENV_OIDC_SCOPES` (default: `openid profile email`)

### Local development defaults (Keycloak)

When `DEV=true`, the API now defaults to local Keycloak bridge credentials:

- `ENV_OIDC_ISSUER=http://localhost:18080/realms/longlink-control-plane`
- `ENV_OIDC_CLIENT_ID=longlink-api`
- `ENV_OIDC_CLIENT_SECRET=longlink-secret`

If you run Keycloak directly on your machine (for example on `localhost:8080`) instead of the
repository `compose.yml`, override `ENV_OIDC_ISSUER` in `api/.env`.

`compose.yml` imports a development `longlink-control-plane` realm automatically
on startup, including the `longlink-api` client and `longlink-secret` credentials.
