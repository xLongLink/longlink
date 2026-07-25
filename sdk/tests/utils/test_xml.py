import pytest
from typing import Any
from pathlib import Path
from longlink.utils import xml as xml_utils
from longlink.constants import ROOT
from longlink.utils.xml import Element

ADAPTERS = ROOT / ".static" / "xsd" / "adapters"
ROOT_SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"
SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"


def _adapter_schema(name: str) -> Path:
    """Return one adapter schema path."""

    return ADAPTERS / name


VALID_FRAGMENTS = [
    (
        "action",
        _adapter_schema("Action.xsd"),
        '<Action action="/profile" method="PATCH" json="${profile}"><Button label="Save" /></Action>',
    ),
    ("avatar", _adapter_schema("Avatar.xsd"), '<Avatar size="md" src="/ada.png" name="Ada Lovelace" />'),
    ("badge", _adapter_schema("Badge.xsd"), '<Badge label="$item.status" variant="success" />'),
    ("banner", _adapter_schema("Banner.xsd"), '<Banner status="warning" title="Review required"><Text value="Details" /></Banner>'),
    (
        "button",
        _adapter_schema("Button.xsd"),
        '<Button append="cart" item="${item}" type="submit" variant="primary" size="sm" if="${canSave}" i18n="actions.save" />',
    ),
    (
        "button-group",
        _adapter_schema("ButtonGroup.xsd"),
        '<ButtonGroup label="Actions" orientation="horizontal"><Button label="Cancel" /><Button label="Save" variant="primary" /></ButtonGroup>',
    ),
    ("card", _adapter_schema("Card.xsd"), '<Card variant="muted" padding="4"><Text i18n="cards.content" /></Card>'),
    (
        "checkbox-input",
        _adapter_schema("CheckboxInput.xsd"),
        '<CheckboxInput label="Archive" value="$form.archive" isDisabled="false" size="sm" />',
    ),
    ("code", _adapter_schema("Code.xsd"), '<Code value="$item.code" color="secondary" />'),
    (
        "dialog",
        _adapter_schema("Dialog.xsd"),
        '<Dialog title="Delete issue" triggerLabel="Open" isOpen="$dialog.value" purpose="form"><Text i18n="issues.deleteDescription" /></Dialog>',
    ),
    ("divider", _adapter_schema("Divider.xsd"), '<Divider label="or" variant="strong" />'),
    ("file-input", _adapter_schema("FileInput.xsd"), '<FileInput label="Document" value="$document.file" accept=".pdf" mode="dropzone" />'),
    ("for", _adapter_schema("For.xsd"), '<For each="items" as="item"><Text i18n="items.name" /></For>'),
    (
        "form-layout",
        _adapter_schema("FormLayout.xsd"),
        '<FormLayout direction="horizontal"><TextInput label="Name" /><NumberInput label="Quantity" /></FormLayout>',
    ),
    ("grid", _adapter_schema("Grid.xsd"), '<Grid minColumnWidth="240" maxColumns="3" gap="4"><Card /></Grid>'),
    ("heading", _adapter_schema("Heading.xsd"), '<Heading level="1" i18n="dashboard.title" />'),
    ("icon", _adapter_schema("Icon.xsd"), '<Icon icon="info" size="sm" if="show" />'),
    ("link", _adapter_schema("Link.xsd"), '<Link to="/issues/123" i18n="issues.open" />'),
    ("longlink", _adapter_schema("Longlink.xsd"), '<longlink name="dashboard" icon="layout-dashboard" />'),
    ("number-input", _adapter_schema("NumberInput.xsd"), '<NumberInput label="Quantity" value="$order.quantity" min="1" step="1" />'),
    ("query", _adapter_schema("Query.xsd"), '<Query id="projects" path="/projects" />'),
    (
        "radio-list",
        _adapter_schema("RadioList.xsd"),
        '<RadioList label="Priority" value="$form.priority"><RadioListItem value="high" label="High" /></RadioList>',
    ),
    (
        "selector",
        _adapter_schema("Selector.xsd"),
        '<Selector label="View" value="$filters.view"><SelectorOption value="overview" /></Selector>',
    ),
    ("slider", _adapter_schema("Slider.xsd"), '<Slider label="Volume" value="$settings.volume" min="0" max="100" />'),
    ("stack", _adapter_schema("Stack.xsd"), '<Stack direction="horizontal" justify="between" gap="4"><Text value="First" /></Stack>'),
    ("state", _adapter_schema("State.xsd"), '<State id="filters" value="[]" />'),
    ("switch", _adapter_schema("Switch.xsd"), '<Switch label="Notifications" value="$settings.notifications" labelPosition="start" />'),
    (
        "table",
        _adapter_schema("Table.xsd"),
        '<Table data="$items" rowName="item" emptyLabel="No items"><TableColumn key="sku-column" field="sku" header="SKU" /></Table>',
    ),
    (
        "tab-list",
        _adapter_schema("TabList.xsd"),
        '<TabList value="$tabs.value" label="Views"><Tab value="overview" label="Overview"><Text i18n="tabs.overviewPanel" /></Tab></TabList>',
    ),
    ("text", _adapter_schema("Text.xsd"), '<Text i18n="items.name" values="${{ name: item.name }}" />'),
    ("text-area", _adapter_schema("TextArea.xsd"), '<TextArea label="Notes" rows="4" value="$form.notes" if="canEdit" />'),
    ("text-input", _adapter_schema("TextInput.xsd"), '<TextInput label="Name" value="$form.name" type="text" size="lg" />'),
]

INVALID_FRAGMENTS = [
    ("unknown-action-attribute", _adapter_schema("Action.xsd"), '<Action tone="accent"><Button i18n="actions.save" /></Action>'),
    ("missing-button-label", _adapter_schema("Button.xsd"), "<Button />"),
    ("old-text-interpolation", _adapter_schema("Text.xsd"), '<Text i18n="users.name" name="$user.name" />'),
    ("missing-for-as", _adapter_schema("For.xsd"), '<For each="items" />'),
    ("forbidden-style-through-root", ROOT_SCHEMA, '<longlink><Button label="Save" style="color: red" /></longlink>'),
    ("invalid-child-through-root", ROOT_SCHEMA, '<longlink><Action tone="accent"><Button i18n="actions.save" /></Action></longlink>'),
    (
        "missing-selector-option-value",
        _adapter_schema("Selector.xsd"),
        '<Selector label="View"><SelectorOption label="Overview" /></Selector>',
    ),
    ("old-visual-alias", ROOT_SCHEMA, '<longlink><P i18n="items.name" /></longlink>'),
    ("missing-query-path", _adapter_schema("Query.xsd"), '<Query id="projects" />'),
    ("missing-state-id", _adapter_schema("State.xsd"), '<State value="[]" />'),
    ("missing-table-column-key", _adapter_schema("Table.xsd"), '<Table data="$items"><TableColumn field="sku" /></Table>'),
    ("missing-tab-value", _adapter_schema("TabList.xsd"), '<TabList><Tab label="Overview"><Text i18n="tabs.overview" /></Tab></TabList>'),
    ("malformed-longlink", _adapter_schema("Longlink.xsd"), '<longlink><Text i18n="dashboard.title"></longlink>'),
]

UNSUPPORTED_MARKUP_FRAGMENTS = [
    ("doctype", "<!DOCTYPE longlink><longlink />"),
    ("entity", '<!DOCTYPE longlink [<!ENTITY hidden "value">]><longlink />'),
    ("cdata", "<longlink><![CDATA[hidden]]></longlink>"),
]


def test_element_validation_uses_safe_xml_parser(monkeypatch) -> None:
    """Disable DTD loading, network access, and entity resolution during validation."""

    captured_kwargs: list[dict[str, object]] = []
    original_parser = xml_utils.etree.XMLParser

    def fake_xml_parser(*args: Any, **kwargs: Any) -> object:
        """Capture parser security options while preserving parser behavior."""

        captured_kwargs.append(kwargs)
        return original_parser(*args, **kwargs)

    monkeypatch.setattr(xml_utils.etree, "XMLParser", fake_xml_parser)

    Element.from_content("<longlink />", schema=SCHEMA).validate()

    assert captured_kwargs[0]["load_dtd"] is False
    assert captured_kwargs[0]["no_network"] is True
    assert captured_kwargs[0]["resolve_entities"] is False


@pytest.mark.parametrize(("_name", "content"), UNSUPPORTED_MARKUP_FRAGMENTS, ids=[case[0] for case in UNSUPPORTED_MARKUP_FRAGMENTS])
def test_element_validation_rejects_unsupported_markup(_name: str, content: str) -> None:
    """Reject XML markup unsupported by the browser runtime."""

    element = Element.from_content(content, schema=SCHEMA)

    with pytest.raises(ValueError, match="DOCTYPE, ENTITY, and CDATA"):
        element.validate()


@pytest.mark.parametrize(("_name", "schema", "content"), VALID_FRAGMENTS, ids=[case[0] for case in VALID_FRAGMENTS])
def test_adapter_schema_accepts_valid_fragments(_name: str, schema: Path, content: str) -> None:
    """Validate representative XML fragments for each adapter schema."""

    element = Element.from_content(content, schema=schema)

    element.validate()


@pytest.mark.parametrize(("_name", "schema", "content"), INVALID_FRAGMENTS, ids=[case[0] for case in INVALID_FRAGMENTS])
def test_adapter_schema_rejects_invalid_fragments(_name: str, schema: Path, content: str) -> None:
    """Reject representative invalid XML fragments through adapter schemas."""

    element = Element.from_content(content, schema=schema)

    with pytest.raises(ValueError):
        element.validate()
