"""Tests for the `Dialog` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Dialog.xsd"


def test_dialog_validation() -> None:
    """Validate a minimal `Dialog` fragment."""

    element = Element.from_content('<Dialog><DialogContent /></Dialog>', schema=SCHEMA)
    element.validate()


def test_dialog_content_validation() -> None:
    """Validate a minimal `DialogContent` fragment."""

    element = Element.from_content('<DialogContent />', schema=SCHEMA)
    element.validate()


def test_dialog_description_validation() -> None:
    """Validate a minimal `DialogDescription` fragment."""

    element = Element.from_content('<DialogDescription />', schema=SCHEMA)
    element.validate()


def test_dialog_footer_validation() -> None:
    """Validate a minimal `DialogFooter` fragment."""

    element = Element.from_content('<DialogFooter />', schema=SCHEMA)
    element.validate()


def test_dialog_header_validation() -> None:
    """Validate a minimal `DialogHeader` fragment."""

    element = Element.from_content('<DialogHeader />', schema=SCHEMA)
    element.validate()


def test_dialog_title_validation() -> None:
    """Validate a minimal `DialogTitle` fragment."""

    element = Element.from_content('<DialogTitle />', schema=SCHEMA)
    element.validate()


def test_dialog_trigger_validation() -> None:
    """Validate a minimal `DialogTrigger` fragment."""

    element = Element.from_content('<DialogTrigger />', schema=SCHEMA)
    element.validate()
