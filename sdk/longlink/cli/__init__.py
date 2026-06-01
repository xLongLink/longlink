"""LongLink CLI exports."""

from __future__ import annotations

from typing import Any

__all__ = [
    "load_app",
    "dev_command",
    "docs_command",
    "setup",
    "init_command",
    "main",
    "build_app",
    "build_command",
    "sample_command",
    "load_sample_app",
]


def __getattr__(name: str) -> Any:
    """Lazily load CLI commands to avoid importing optional runtime deps."""

    if name in {"load_app", "dev_command"}:
        from .dev import load_app, dev_command

        exports = {"load_app": load_app, "dev_command": dev_command}
    elif name == "docs_command":
        from .docs import docs_command

        exports = {"docs_command": docs_command}
    elif name in {"setup", "init_command"}:
        from .init import setup, init_command

        exports = {"setup": setup, "init_command": init_command}
    elif name == "main":
        from .main import main

        exports = {"main": main}
    elif name in {"build_app", "build_command"}:
        from .build import build_app, build_command

        exports = {"build_app": build_app, "build_command": build_command}
    elif name in {"sample_command", "load_sample_app"}:
        from .sample import sample_command, load_sample_app

        exports = {"sample_command": sample_command, "load_sample_app": load_sample_app}
    else:
        raise AttributeError(f"module 'longlink.cli' has no attribute {name!r}")

    globals().update(exports)
    return exports[name]
