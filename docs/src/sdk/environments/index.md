# Environments

LongLink SDK uses environment objects to configure runtime behavior.
The SDK reads values from process environment and from `.env`.

## Base classes and helpers

The SDK exposes:

- `ENV`: base settings model for application variables
- `ENVDev`: development defaults used when `DEV=true`
- `envs`: default loaded environment object
- `get_envs()`: cached loader for default environment object

The SDK also keeps aliases `Envs` and `EnvsDev` for compatibility.

## Variables

The default environment model includes:

- `DEV`: enable local development mode
- `KEY`: application key
- `DBURL`: application database URL
- `storage_key`: object storage access key
- `storage_secret`: object storage secret
- `storage_endpoint`: object storage endpoint URL

## Development mode

Set `DEV=true` to use development defaults from `ENVDev`.
In development mode, the SDK uses:

- `DBURL=sqlite:///./dev.db`
- `storage_key=dev`
- `storage_secret=dev`
- `storage_endpoint=http://localhost:9000`

## Application wrapper integration

LongLink SDK application is now an `App` wrapper around FastAPI.
The wrapper takes an `ENV` object during initialization.

This means environment validation happens when `ENV` object is created.
If any required variable is missing or invalid, application creation fails early.

The wrapper stores validated object at `app.state.env`.
Routes and services can read typed values from this location.

## Showcase: define custom environment and create application

```python
from longlink import App, ENV


class ProjectENV(ENV):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API_BASE_URL: str


project_env = ProjectENV()
application = App(env=project_env)
app = application.fastapi
```

In this flow:

1. `ProjectENV()` validates standard and custom variables.
2. `App(env=project_env)` binds validated object to FastAPI state.
3. `app` is ready for uvicorn with full typed environment context.

## Showcase: extend current environment for new requirements

```python
from longlink import App, ENVDev


class ExtendedDevENV(ENVDev):
    """Development environment with extra project variables."""

    DEMO_BUCKET_PREFIX: str = "demo"


extended_env = ExtendedDevENV()
application = App(env=extended_env)
app = application.fastapi
```

Use this pattern when application needs extra environment variables without losing SDK defaults.
