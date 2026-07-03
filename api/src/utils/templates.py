import yaml
from string import Template
from typing import Any
from pathlib import Path


def readyml(template_path: str | Path, **context: object) -> dict[str, Any] | list[dict[str, Any]]:
    """Render one YAML template file into a manifest dictionary or list."""

    source = Path(template_path)
    rendered = Template(source.read_text(encoding="utf-8")).safe_substitute(**context)
    docs: list[dict[str, Any]] = []
    for document in yaml.safe_load_all(rendered):
        if document is None:
            continue

        if not isinstance(document, dict):
            raise ValueError("Rendered YAML templates must contain mapping documents")

        docs.append(document)

    if not docs:
        raise ValueError("Rendered YAML template did not contain any documents")

    return docs if len(docs) > 1 else docs[0]
