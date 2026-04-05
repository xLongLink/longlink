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
