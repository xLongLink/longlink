from typing import Any


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
    elif name == "translations_command":
        from .translations import translations_command

        exports = {"translations_command": translations_command}
    else:
        raise AttributeError(f"module 'longlink.cli' has no attribute {name!r}")

    globals().update(exports)
    return exports[name]
