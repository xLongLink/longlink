import pytest
from longlink.constants import ROOT
from longlink.utils.xml import Element

SCHEMA = ROOT / ".static" / "xsd" / "adapters" / "Longlink.xsd"
ROOT_SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"


def test_longlink_layout_validation() -> None:
    """Validate a minimal `longlink` layout fragment."""

    element = Element.from_content('<longlink><P i18n="Dashboard" /></longlink>', schema=SCHEMA)
    element.validate()


def test_longlink_layout_allows_nested_children() -> None:
    """Allow nested XML children inside `longlink`."""

    element = Element.from_content(
        (
            '<longlink><State id="filters" value="[]" /><Query id="projects" path="/projects" />'
            '<Action action="/projects" method="POST"><Button i18n="Create" /></Action>'
            '<Field><FieldLabel i18n="Name" /><Input value="$draft.name" /></Field>'
            '<Flex space="between"><P i18n="Name" /><Badge i18n="Live" /></Flex></longlink>'
        ),
        schema=SCHEMA,
    )
    element.validate()


def test_longlink_layout_allows_metadata_attributes() -> None:
    """Allow `name` and `icon` attributes on `longlink`."""

    element = Element.from_content(
        '<longlink name="dashboard" icon="layout-dashboard"><P i18n="Dashboard" /></longlink>',
        schema=SCHEMA,
    )
    element.validate()


def test_longlink_layout_rejects_unknown_root_attributes() -> None:
    """Reject unsupported attributes on `longlink`."""

    element = Element.from_content(
        '<longlink hidden="true"><P i18n="Dashboard" /></longlink>',
        schema=SCHEMA,
    )

    with pytest.raises(ValueError):
        element.validate()


def test_longlink_layout_validates_known_child_attributes() -> None:
    """Validate known child adapters through the root schema."""

    element = Element.from_content(
        '<longlink><Action tone="accent"><Button i18n="Save" /></Action></longlink>',
        schema=ROOT_SCHEMA,
    )

    with pytest.raises(ValueError):
        element.validate()


def test_longlink_layout_rejects_malformed_xml() -> None:
    """Normalize malformed XML syntax failures as validation errors."""

    element = Element.from_content('<longlink><P i18n="Dashboard"></longlink>', schema=SCHEMA)

    with pytest.raises(ValueError, match="XML syntax is invalid"):
        element.validate()
