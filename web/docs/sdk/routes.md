---
lastUpdated: 2026-05-25
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/sdk/routes.md
---

# Endpoints

LongLink SDK wraps FastAPI.

You define endpoint handlers on the wrapped FastAPI app.

## Usage

```python
from longlink import App, Router, Context
from pydantic import BaseModel

router = Router()


class SampleResponse(BaseModel):
    id: int
    name: str


@router.get("/sample", response_model=SampleResponse)
async def sample(ctx: Context) -> SampleResponse:
    return SampleResponse(id=1, name="apple")


app = App()
app.register(router)
```

## Resources

- [FastAPI tutorial](https://fastapi.tiangolo.com/tutorial/)
- [Path operation decorators](https://fastapi.tiangolo.com/tutorial/path-operation-configuration/)
- [Request body with Pydantic](https://fastapi.tiangolo.com/tutorial/body/)
- [Dependencies](https://fastapi.tiangolo.com/tutorial/dependencies/)
- [Response models](https://fastapi.tiangolo.com/tutorial/response-model/)
