"""Tests for the `Dialog` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Dialog.xsd"


def test_dialog_validation() -> None:
    """Validate a compound `Dialog` fragment."""

    element = Element.from_content(
        '<Dialog open="true"><DialogTrigger>Open dialog</DialogTrigger><DialogContent><DialogTitle>Delete issue</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription><Button>Actions</Button></DialogContent></Dialog>',
        schema=SCHEMA,
    )

    element.validate()


def test_dialog_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `Dialog`."""

    element = Element.from_content('<Dialog tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
