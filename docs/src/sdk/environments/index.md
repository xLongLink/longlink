# Environments

LongLink SDK uses environment variables to configure runtime behavior.
The SDK reads values from process environment and from `.env`.

## Load behavior

The SDK now loads environments when `longlink.envs` is imported.
This means invalid or missing required values fail fast during startup.

The module exposes:

- `envs`: loaded settings object
- `get_envs()`: cached loader function
- `Envs`: base settings model
- `EnvsDev`: development defaults used when `DEV=true`

## Variables

The SDK environment model includes:

- `DEV`: enable local development mode
- `KEY`: application key
- `DBURL`: application database URL
- `storage_key`: object storage access key
- `storage_secret`: object storage secret
- `storage_endpoint`: object storage endpoint URL

## Development mode

Set `DEV=true` to use development defaults from `EnvsDev`.
In development mode, the SDK uses:

- `DBURL=sqlite:///./dev.db`
- `storage_key=dev`
- `storage_secret=dev`
- `storage_endpoint=http://localhost:9000`

## Example

```python
from longlink.envs import envs

print(envs.DBURL)
print(envs.storage_endpoint)
```

Use environment variables or `.env` to override defaults.
