# Storage

LongLink SDK exposes a native `fs` object.
You can use it like a standard `fsspec` filesystem.

## Usage

```python
from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")
```

## references

- [fsspec Documentation](https://filesystem-spec.readthedocs.io/en/latest/)
- [fsspec GitHub](https://github.com/fsspec/filesystem_spec)
