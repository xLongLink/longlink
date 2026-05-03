# Storage

LongLink SDK exposes a native `fsspec` filesystem through the request context.
You can use the filesystem exactly like standard `fsspec` clients.

## Usage

```python
import fsspec
from longlink import Router, Context

router = Router()

@router.post("/files")
async def create_file(ctx: Context):
    fs = ctx.fs()
    with fs.open("reports/example.txt", "wb") as f:
        f.write(b"hello")

    return {"success": True }
```

## references

- [fsspec Documentation](https://filesystem-spec.readthedocs.io/en/latest/)
- [fsspec Github](https://github.com/fsspec/filesystem_spec)
