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
    with fs.open("reports/example.txt", "wb") as file_handle:
        file_handle.write(b"hello")

    return {"path": "reports/example.txt"}
```

## Configure S3 credentials

```python
import fsspec

fs = fsspec.filesystem(
    "s3",
    key="YOUR_KEY",
    secret="YOUR_SECRET",
)
```

LongLink builds the same kind of filesystem object internally from app settings,
then provides it in each request via `ctx.fs()`.

## references

- [fsspec Documentation](https://filesystem-spec.readthedocs.io/en/latest/)
- [fsspec Github](https://github.com/fsspec/filesystem_spec)
