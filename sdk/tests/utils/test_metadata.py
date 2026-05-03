"""Tests for SDK metadata loading helpers."""

from __future__ import annotations

import sys
import importlib.util
from pathlib import Path
from longlink.constants import ROOT


def load_metadata_module():
    """Load metadata module directly from source file without importing package root."""

    module_path = ROOT / "utils" / "metadata.py"

    # Load module by file path because package root currently imports unrelated subsystems.
    spec = importlib.util.spec_from_file_location("sdk_metadata_module", module_path)
    assert spec is not None
    assert spec.loader is not None

    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_load_metadata_uses_project_defaults(tmp_path):
    """Ensure loader reads project metadata values from pyproject.toml."""

    module = load_metadata_module()

    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        """
[project]
name = "demo-app"
version = "1.2.3"
description = "Demo description"
""".strip()
    )

    metadata = module.load_metadata(pyproject)

    assert metadata.name == "demo-app"
    assert metadata.version == "1.2.3"
    assert metadata.description == "Demo description"


def test_load_metadata_prefers_tool_longlink_section(tmp_path):
    """Ensure LongLink tool metadata overrides project-level fallback values."""

    module = load_metadata_module()

    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        """
[project]
name = "fallback-name"
version = "0.0.1"

[tool.longlink]
name = "tool-name"
version = "9.9.9"
""".strip()
    )

    metadata = module.load_metadata(pyproject)

    assert metadata.name == "tool-name"
    assert metadata.version == "9.9.9"


def test_load_metadata_accepts_explicit_overrides(tmp_path):
    """Ensure explicit loader kwargs take highest precedence over file values."""

    module = load_metadata_module()

    pyproject = tmp_path / "pyproject.toml"
    pyproject.write_text(
        """
[project]
name = "base-name"
version = "0.0.1"
""".strip()
    )

    metadata = module.load_metadata(pyproject, name="override-name")

    assert metadata.name == "override-name"
