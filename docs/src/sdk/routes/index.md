# Endpoints

LongLink SDK wraps FastAPI.
You define endpoint handlers on the wrapped FastAPI app.

## How endpoint setup works

1. Create environment object.
2. Create `App(env=...)` wrapper.
3. Access FastAPI instance with `application.fastapi`.
4. Register endpoints with FastAPI decorators.

## Basic endpoint example

```python

router

from longlink import App, ENV


env = ENV()
application = App(env=env)
app = application.fastapi


@app.get("/health")
def health() -> dict[str, str]:
    """Return basic service health status."""

    return {"status": "ok"}
```

## Endpoint with request and response models

```python
from pydantic import BaseModel
from longlink import App, ENV


class ItemCreate(BaseModel):
    """Request model for item creation."""

    name: str


class ItemResponse(BaseModel):
    """Response model for item payload."""

    id: int
    name: str


env = ENV()
application = App(env=env)
app = application.fastapi


@app.post("/items", response_model=ItemResponse)
def create_item(payload: ItemCreate) -> ItemResponse:
    """Create item and return normalized response."""

    return ItemResponse(id=1, name=payload.name)
```

## FastAPI references

LongLink endpoint layer follows FastAPI behavior.
Use FastAPI docs for decorator options, validation, dependency injection, and OpenAPI metadata.

- [FastAPI tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Path operation decorators](https://fastapi.tiangolo.com/tutorial/path-operation-configuration/)
- [Request body with Pydantic](https://fastapi.tiangolo.com/tutorial/body/)
- [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Response models](https://fastapi.tiangolo.com/tutorial/response-model/)

::: tip
Use standard FastAPI patterns for routers and dependencies.
LongLink wrapper does not replace FastAPI routing model.
:::
