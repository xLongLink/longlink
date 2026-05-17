"""Tests for the `Toggle` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Toggle.xsd"


def test_toggle_validation() -> None:
    """Validate a minimal `Toggle` fragment."""

    element = Element.from_content(
        '<Toggle pressed="true" defaultPressed="false" className="gap-2" disabled="true" size="sm" variant="outline" if="canEdit" />',
        schema=SCHEMA,
    )
    element.validate()


def test_toggle_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Toggle`."""

    element = Element.from_content('<Toggle tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
