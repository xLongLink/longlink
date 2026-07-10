from typing import Any


def __getattr__(name: str) -> Any:
    """Lazily load CLI commands to avoid importing optional runtime deps."""

    exports: dict[str, Any]

    # Load the requested command module only when its export is accessed.
    if name == "dev_command":
        from .dev import dev_command

        exports = {"dev_command": dev_command}

    # Load docs command support only on demand.
    elif name == "docs_command":
        from .docs import docs_command

        exports = {"docs_command": docs_command}

    # Load project initialization support only on demand.
    elif name == "init_command":
        from .init import init_command

        exports = {"init_command": init_command}

    # Load the root CLI entrypoint only on demand.
    elif name == "main":
        from .main import main

        exports = {"main": main}

    # Load build support only on demand.
    elif name in {"build_app", "build_command"}:
        from .build import build_app, build_command

        exports = {"build_app": build_app, "build_command": build_command}

    # Load translation support only on demand.
    elif name == "translations_command":
        from .translations import translations_command

        exports = {"translations_command": translations_command}

    # Reject names that are not part of the lazy CLI surface.
    else:
        raise AttributeError(f"module 'longlink.cli' has no attribute {name!r}")

    globals().update(exports)
    return exports[name]
