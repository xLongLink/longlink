import json
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel


class Metadata(BaseModel):
    name: str = 'Sample LongLink app'
    description: str = ''
    version: str = '0.0.0'


@lru_cache(maxsize=1)
def get_metadata() -> Metadata:
    metadata_file = Path.cwd() / 'metadata.json'
    if not metadata_file.exists():
        return Metadata()

    try:
        payload = json.loads(metadata_file.read_text())
    except (json.JSONDecodeError, OSError):
        return Metadata()

    if not isinstance(payload, dict):
        return Metadata()

    return Metadata.model_validate(payload)


class _LazyMetadata:
    def __getattr__(self, item):
        return getattr(get_metadata(), item)

    def model_dump(self) -> dict[str, object]:
        return get_metadata().model_dump()


metadata = _LazyMetadata()
