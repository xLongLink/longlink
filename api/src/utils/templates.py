from __future__ import annotations

import yaml as pyyaml
from string import Template
from pathlib import Path


def yaml(template_path: str | Path, **context: str) -> dict:
    """Render one YAML template file into a manifest dictionary."""
    source = Path(template_path)
    rendered = Template(source.read_text(encoding="utf-8")).safe_substitute(**context)
    return pyyaml.safe_load(rendered)
