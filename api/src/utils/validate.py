from __future__ import annotations

import re


def knames(value: str, label: str = "Value") -> str:
    """Validate one Kubernetes DNS label value and return it unchanged."""
    if not re.match(r"^[a-z0-9]([-a-z0-9]*[a-z0-9])?$", value):
        raise ValueError(
            f"{label} must contain only lowercase letters, numbers, and hyphens"
        )

    return value
