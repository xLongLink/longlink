# Environments

In order to manage enviroment variables longlink expose a `Enviroments` class that is a wrapper on top of `pydantic_settings`. Enviroments are loaded and validated at startup time, ensuring that the rest of the application logic works. 


## Usage

```python
from longlink import App, Enviroments


class Env(Enviroments):
    """Project-specific environment model."""

    FEATURE_FLAG: bool
    EXTERNAL_API: str
    

env = Env()
app = App(env=env)
```

## References

- [Pydantic Settings](https://pydantic.dev/docs/validation/latest/concepts/pydantic_settings/)