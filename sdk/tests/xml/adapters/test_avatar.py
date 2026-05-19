"""Tests for the `Avatar` XML schema."""

from __future__ import annotations

import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "react" / "Avatar.xsd"


def test_avatar_validation() -> None:
    """Validate a stacked avatar composition."""

    element = Element.from_content(
        """
        <AvatarGroup>
          <Avatar size="sm">
            <AvatarImage src="/ada.png" alt="Ada Lovelace" />
            <AvatarFallback>AL</AvatarFallback>
            <AvatarBadge>1</AvatarBadge>
          </Avatar>
          <AvatarGroupCount>+2</AvatarGroupCount>
        </AvatarGroup>
        """,
        schema=SCHEMA,
    )

    element.validate()


def test_avatar_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `AvatarImage`."""

    element = Element.from_content('<AvatarImage src="/ada.png" tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
