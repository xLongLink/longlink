import yaml
from string import Template
from typing import Any
from pathlib import Path


def readyml(template_path: str | Path, **context: object) -> dict[str, Any] | list[dict[str, Any]]:
    """Render one YAML template file into a manifest dictionary or list."""

    rendered = Template(Path(template_path).read_text(encoding="utf-8")).safe_substitute(**context)
    docs: list[dict[str, Any]] = []

    # Parse each rendered YAML document separately.
    for document in yaml.safe_load_all(rendered):

        # Ignore empty YAML documents from separators.
        if document is None:
            continue

        # Manifests must render as mapping documents.
        if not isinstance(document, dict):
            raise ValueError("Rendered YAML templates must contain mapping documents")

        docs.append(document)

    # Reject templates that only render empty documents.
    if not docs:
        raise ValueError("Rendered YAML template did not contain any documents")

    return docs if len(docs) > 1 else docs[0]


def readyml_list(template_path: str | Path, **context: object) -> list[dict[str, Any]]:
    """Render one YAML template file into a manifest list."""

    rendered = readyml(template_path, **context)
    return rendered if isinstance(rendered, list) else [rendered]
