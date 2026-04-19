# Endpoints

LongLink SDK wraps FastAPI.
You define endpoint handlers on the wrapped FastAPI app.

## Basic endpoint example

```python
from longlink import App, Router, Context
from pydantic import BaseModel


router = Router()


# Sample response model
class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample(ctx: Context) -> SampleResponse:
    # Access storage and database context
    storage = ctx.storage
    database = ctx.database

    return SampleResponse(id=1, name="apple")


app = App()
app.register(router)
```

## references

- [FastAPI tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Path operation decorators](https://fastapi.tiangolo.com/tutorial/path-operation-configuration/)
- [Request body with Pydantic](https://fastapi.tiangolo.com/tutorial/body/)
- [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Response models](https://fastapi.tiangolo.com/tutorial/response-model/)
