from string import Template
from pathlib import Path

from yaml import safe_load_all


def readyml(template_path: str | Path, **context: str) -> dict | list[dict]:
    """Render one YAML template file into a manifest dictionary or list."""

    source = Path(template_path)
    rendered = Template(source.read_text(encoding="utf-8")).safe_substitute(**context)
    docs = list(safe_load_all(rendered))
    return docs if len(docs) > 1 else docs[0]
