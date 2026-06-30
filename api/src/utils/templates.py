from yaml import safe_load_all
from string import Template
from typing import Any, cast
from pathlib import Path


def readyml(template_path: str | Path, **context: object) -> dict[str, Any] | list[dict[str, Any]]:
    """Render one YAML template file into a manifest dictionary or list."""

    source = Path(template_path)
    rendered = Template(source.read_text(encoding="utf-8")).safe_substitute(**context)
    docs = cast(list[dict[str, Any]], list(safe_load_all(rendered)))
    return docs if len(docs) > 1 else docs[0]
