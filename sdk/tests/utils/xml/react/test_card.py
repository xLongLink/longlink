"""Tests for the `Card` XML schema."""

from __future__ import annotations

from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Card.xsd"


def test_card_validation() -> None:
    """Validate a minimal `Card` fragment."""

    element = Element.from_content('<Card><CardHeader /><CardContent /></Card>', schema=SCHEMA)
    element.validate()


def test_card_action_validation() -> None:
    """Validate a minimal `CardAction` fragment."""

    element = Element.from_content('<CardAction />', schema=SCHEMA)
    element.validate()


def test_card_content_validation() -> None:
    """Validate a minimal `CardContent` fragment."""

    element = Element.from_content('<CardContent />', schema=SCHEMA)
    element.validate()


def test_card_description_validation() -> None:
    """Validate a minimal `CardDescription` fragment."""

    element = Element.from_content('<CardDescription />', schema=SCHEMA)
    element.validate()


def test_card_footer_validation() -> None:
    """Validate a minimal `CardFooter` fragment."""

    element = Element.from_content('<CardFooter />', schema=SCHEMA)
    element.validate()


def test_card_header_validation() -> None:
    """Validate a minimal `CardHeader` fragment."""

    element = Element.from_content('<CardHeader />', schema=SCHEMA)
    element.validate()


def test_card_title_validation() -> None:
    """Validate a minimal `CardTitle` fragment."""

    element = Element.from_content('<CardTitle />', schema=SCHEMA)
    element.validate()
