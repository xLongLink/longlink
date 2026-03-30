import json
from pathlib import Path
from typing import Literal

from pydantic import BaseModel


class Metadata(BaseModel):
    name: str = 'Sample LongLink app'
    description: str = ''
    type: Literal['tool', 'space', 'process'] = 'tool'


def load_metadata() -> Metadata:
    metadata_file = Path.cwd() / 'metadata.json'

    if not metadata_file.exists():
        print('Warning: metadata.json is missing. Using default metadata values.')
        return Metadata()

    try:
        payload = json.loads(metadata_file.read_text())
    except (json.JSONDecodeError, OSError):
        return Metadata()

    if not isinstance(payload, dict):
        return Metadata()

    return Metadata.model_validate(payload)


metadata = load_metadata()
