import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Avatar.xsd"


def test_avatar_validation() -> None:
    """Validate a stacked avatar composition."""

    element = Element.from_content(
        """
        <Avatar size="sm">
          <AvatarImage src="/ada.png" alt="Ada Lovelace" />
          <AvatarFallback><P i18n="AL" /></AvatarFallback>
          <AvatarBadge><P i18n="1" /></AvatarBadge>
        </Avatar>
        """,
        schema=SCHEMA,
    )

    element.validate()


def test_avatar_rejects_unknown_attributes() -> None:
    """Reject attributes that are not allowed on `AvatarImage`."""

    element = Element.from_content('<AvatarImage src="/ada.png" tone="accent" />', schema=SCHEMA)

    with pytest.raises(ValueError):
        element.validate()
