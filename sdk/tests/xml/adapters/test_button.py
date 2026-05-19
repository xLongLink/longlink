"""Tests for the `Button` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Button.xsd"


def test_button_validation() -> None:
    """Validate a minimal `Button` fragment."""

    element = Element.from_content(
        '<Button action="save" method="POST" submit="true" json="${{ value: value }}" invalidate="projects" variant="outline" size="sm" if="${canSave}">Save</Button>',
        schema=SCHEMA,
    )
    element.validate()


def test_button_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Button`."""

    element = Element.from_content('<Button action="save" tone="accent">Save</Button>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_button_rejects_href() -> None:
    """Reject the removed `href` attribute on `Button`."""

    element = Element.from_content('<Button href="/issues">Open</Button>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()


def test_button_rejects_class_name() -> None:
    """Reject the removed `className` attribute on `Button`."""

    element = Element.from_content('<Button className="ghost">Open</Button>', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
