"""LongLink utility exports."""

from __future__ import annotations

from typing import Any

__all__ = ["Element", "Longlink", "Envs", "Environments"]


def __getattr__(name: str) -> Any:
    """Lazily load utility exports when they are first accessed."""

    if name in {"Element", "Longlink"}:
        from .xml import Element, Longlink

        exports = {"Element": Element, "Longlink": Longlink}
    elif name == "Envs":
        from .settings import Envs

        exports = {"Envs": Envs}
    elif name == "Environments":
        from .environments import Environments

        exports = {"Environments": Environments}
    else:
        raise AttributeError(f"module 'longlink.utils' has no attribute {name!r}")

    globals().update(exports)
    return exports[name]
