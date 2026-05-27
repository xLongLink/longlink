---
lastUpdated: 2026-05-25
editUrl: https://github.com/xLongLink/longlink/edit/main/web/docs/sdk/storage.md
---

# Storage

LongLink SDK exposes a native `fs` object. You can use it like a standard [fsspec](https://filesystem-spec.readthedocs.io/en/latest/)
filesystem.

## Usage

```python
from longlink import fs

with fs.open("reports/example.txt", "wb") as f:
    f.write(b"hello")
```

## Resources

- [fsspec Documentation](https://filesystem-spec.readthedocs.io/en/latest/)
- [fsspec GitHub](https://github.com/fsspec/filesystem_spec)
