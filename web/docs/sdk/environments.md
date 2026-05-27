---
lastUpdated: 2026-05-25
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/sdk/environments.md
---

# Environments

The `Environments` class defines and validates environment variables for an application.

The class is a wrapper around [Pydantic Settings](https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/).
LongLink loads and validates all environment variables at application startup.

This ensures that configuration errors are detected early, before the application starts handling requests.

## Usage

```python
from longlink import Environments, LongLink


class Env(Environments):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API: str


env = Env()
app = LongLink(env=env)
```

## Resources

- [Pydantic Settings](https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/)
