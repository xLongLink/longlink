import pytest
from pathlib import Path
from longlink.constants import ROOT
from longlink.utils.xml import Element

ADAPTERS = ROOT / ".static" / "xsd" / "adapters"
ROOT_SCHEMA = ROOT / ".static" / "xsd" / "schema.xsd"


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
    ("badge", _adapter_schema("Badge.xsd"), '<Badge id="item-status" label="$item.status" variant="success"><Icon slot="icon" icon="check" /></Badge>'),
    (
        "button",
        _adapter_schema("Button.xsd"),
        '<Button label="Save" type="submit" variant="primary" size="sm" elevation="low" isInterruptible="true" if="${canSave}" />',
    ),
    ("card", _adapter_schema("Card.xsd"), '<Card variant="muted" padding="4" elevation="low"><Text value="Card content" /></Card>'),
    (
        "checkbox-input",
        _adapter_schema("CheckboxInput.xsd"),
        '<CheckboxInput label="Archive" value="$form.archive" isDisabled="false" size="sm" isLoading="true" />',
    ),
    (
        "dialog",
        _adapter_schema("Dialog.xsd"),
        '<Dialog title="Delete issue" triggerLabel="Open" isOpen="$dialog.value" purpose="form"><Text value="This action cannot be undone." /></Dialog>',
    ),
    ("divider", _adapter_schema("Divider.xsd"), '<Divider label="or" variant="strong" />'),
    ("file-input", _adapter_schema("FileInput.xsd"), '<FileInput label="Document" value="$document.file" accept=".pdf" mode="dropzone" />'),
    ("for", _adapter_schema("For.xsd"), '<For each="items" as="item"><Text value="$item.name" /></For>'),
    (
        "form-layout",
        _adapter_schema("FormLayout.xsd"),
        '<FormLayout direction="horizontal"><TextInput label="Name" /><NumberInput label="Quantity" /></FormLayout>',
    ),
    ("grid", _adapter_schema("Grid.xsd"), '<Grid minColumnWidth="240" maxColumns="3" gap="4" rowHeight="32"><Card /></Grid>'),
    (
        "heading",
        _adapter_schema("Heading.xsd"),
        '<Heading level="1" type="display-1" accessibilityLevel="2" color="accent" display="inline" maxLines="2" hasTruncateTooltip="below" wordBreak="break-word" textWrap="balance" justify="center" hasCapsize="true" hasStrikethrough="true" id="dashboard-heading"><Text value="Dashboard" /></Heading>',
    ),
    ("icon", _adapter_schema("Icon.xsd"), '<Icon icon="info" size="sm" if="show" />'),
    ("link", _adapter_schema("Link.xsd"), '<Link to="/issues/123" label="Open issue" />'),
    ("longlink", _adapter_schema("Longlink.xsd"), '<longlink version="0.3" name="dashboard" icon="layout-dashboard" />'),
    ("number-input", _adapter_schema("NumberInput.xsd"), '<NumberInput label="Quantity" value="$order.quantity" min="1" step="1" hasAutoFocus="true" labelTooltip="Enter a quantity" statusVariant="tooltip" />'),
    ("query", _adapter_schema("Query.xsd"), '<Query id="projects" path="/projects" />'),
    (
        "radio-list",
        _adapter_schema("RadioList.xsd"),
        '<RadioList label="Priority" value="$form.priority"><RadioListItem value="high" label="High" /></RadioList>',
    ),
    (
        "selector",
        _adapter_schema("Selector.xsd"),
        '<Selector label="View" value="$filters.view" variant="ghost" isLoading="true" isDefaultOpen="true" labelTooltip="Select a view" placement="above" statusVariant="tooltip"><SelectorOption value="overview" label="Overview" /></Selector>',
    ),
    ("slider", _adapter_schema("Slider.xsd"), '<Slider label="Volume" value="$settings.volume" min="0" max="100" />'),
    ("stack", _adapter_schema("Stack.xsd"), '<Stack direction="horizontal" justify="between" gap="4"><Text value="First" /></Stack>'),
    ("state", _adapter_schema("State.xsd"), '<State id="filters" value="[]" />'),
    ("switch", _adapter_schema("Switch.xsd"), '<Switch label="Notifications" value="$settings.notifications" size="sm" isLoading="true" labelTooltip="Toggle notifications" labelPosition="start" />'),
    (
        "table",
        _adapter_schema("Table.xsd"),
        '<Table data="$items" emptyLabel="No items"><TableColumn key="sku-column" field="sku" header="SKU" /></Table>',
    ),
    (
        "tab-list",
        _adapter_schema("TabList.xsd"),
        '<TabList value="$tabs.value" label="Views"><Tab value="overview" label="Overview"><Text value="Overview panel" /></Tab></TabList>',
    ),
    (
        "text",
        _adapter_schema("Text.xsd"),
        '<Text id="item-name" as="p" type="large" size="lg" color="accent" value="$item.name" weight="semibold" display="block" justify="center" maxLines="2" textWrap="balance" wordBreak="break-word" hasCapsize="true" hasStrikethrough="true" hasTabularNumbers="true" hasTruncateTooltip="below" />',
    ),
    ("text-area", _adapter_schema("TextArea.xsd"), '<TextArea label="Notes" rows="4" value="$form.notes" isLoading="true" labelTooltip="Add notes" statusVariant="tooltip" if="canEdit" />'),
    ("text-input", _adapter_schema("TextInput.xsd"), '<TextInput label="Name" value="$form.name" type="text" size="lg" isLoading="true" statusVariant="tooltip" />'),
]

INVALID_FRAGMENTS = [
    ("unknown-action-attribute", _adapter_schema("Action.xsd"), '<Action tone="accent"><Button label="Save" /></Action>'),
    ("removed-avatar-fallback-src", _adapter_schema("Avatar.xsd"), '<Avatar fallbackSrc="/fallback.png" />'),
    ("removed-button-append", _adapter_schema("Button.xsd"), '<Button label="Add" append="cart" item="${item}" />'),
    ("removed-button-item", _adapter_schema("Button.xsd"), '<Button label="Add" item="${item}" />'),
    ("removed-dialog-trigger-variant", _adapter_schema("Dialog.xsd"), '<Dialog title="Edit" triggerVariant="primary" />'),
    ("removed-dialog-trigger-size", _adapter_schema("Dialog.xsd"), '<Dialog title="Edit" triggerSize="sm" />'),
    ("invalid-heading-type", _adapter_schema("Heading.xsd"), '<Heading level="1" type="headline" value="Title" />'),
    ("removed-icon-color", _adapter_schema("Icon.xsd"), '<Icon icon="info" color="accent" />'),
    ("badge-unknown-slot", _adapter_schema("Badge.xsd"), '<Badge label="Active"><Icon slot="endContent" icon="check" /></Badge>'),
    ("badge-unsupported-child", _adapter_schema("Badge.xsd"), '<Badge label="Active"><Text value="Active" /></Badge>'),
    ("badge-duplicate-icon", _adapter_schema("Badge.xsd"), '<Badge label="Active"><Icon icon="check" /><Icon icon="x" /></Badge>'),
    ("missing-button-label", _adapter_schema("Button.xsd"), "<Button />"),
    ("missing-for-as", _adapter_schema("For.xsd"), '<For each="items" />'),
    ("forbidden-style-through-root", ROOT_SCHEMA, '<longlink version="0.3"><Button label="Save" style="color: red" /></longlink>'),
    (
        "invalid-child-through-root",
        ROOT_SCHEMA,
        '<longlink version="0.3"><Action tone="accent"><Button label="Save" /></Action></longlink>',
    ),
    (
        "missing-selector-option-value",
        _adapter_schema("Selector.xsd"),
        '<Selector label="View"><SelectorOption label="Overview" /></Selector>',
    ),
    ("old-visual-alias", ROOT_SCHEMA, '<longlink version="0.3"><P value="$item.name" /></longlink>'),
    ("missing-query-path", _adapter_schema("Query.xsd"), '<Query id="projects" />'),
    ("missing-state-id", _adapter_schema("State.xsd"), '<State value="[]" />'),
    ("missing-table-column-key", _adapter_schema("Table.xsd"), '<Table data="$items"><TableColumn field="sku" /></Table>'),
    ("removed-table-row-name", _adapter_schema("Table.xsd"), '<Table data="$items" rowName="item"><TableColumn key="sku" /></Table>'),
    ("removed-table-column-width", _adapter_schema("Table.xsd"), '<Table data="$items"><TableColumn key="sku" width="1" /></Table>'),
    (
        "removed-table-column-width-type",
        _adapter_schema("Table.xsd"),
        '<Table data="$items"><TableColumn key="sku" widthType="pixel" /></Table>',
    ),
    (
        "removed-table-column-min-width",
        _adapter_schema("Table.xsd"),
        '<Table data="$items"><TableColumn key="sku" minWidth="100" /></Table>',
    ),
    ("missing-tab-value", _adapter_schema("TabList.xsd"), '<TabList><Tab label="Overview"><Text value="Overview" /></Tab></TabList>'),
    ("malformed-longlink", _adapter_schema("Longlink.xsd"), '<longlink version="0.3"><Text value="Dashboard"></longlink>'),
]

UNSUPPORTED_MARKUP_FRAGMENTS = [
    ("doctype", '<!DOCTYPE longlink><longlink version="0.3" />'),
    ("entity", '<!DOCTYPE longlink [<!ENTITY hidden "value">]><longlink version="0.3" />'),
    ("cdata", '<longlink version="0.3"><![CDATA[hidden]]></longlink>'),
]


def element_from_file(tmp_path: Path, content: str, schema: Path) -> Element:
    """Write XML content to a temporary file for ordinary Element validation."""

    path = tmp_path / "page.xml"
    path.write_text(content, encoding="utf-8")
    return Element(path, schema=schema)


@pytest.mark.parametrize(("_name", "content"), UNSUPPORTED_MARKUP_FRAGMENTS, ids=[case[0] for case in UNSUPPORTED_MARKUP_FRAGMENTS])
def test_element_validation_rejects_unsupported_markup(_name: str, content: str, tmp_path: Path) -> None:
    """Reject XML markup unsupported by the browser runtime."""

    # Build a document containing unsupported browser markup.
    element = element_from_file(tmp_path, content, ROOT_SCHEMA)

    # Validate the document at the shared XML boundary.
    with pytest.raises(ValueError, match="DOCTYPE, ENTITY, and CDATA"):
        element.validate()


@pytest.mark.parametrize(("_name", "schema", "content"), VALID_FRAGMENTS, ids=[case[0] for case in VALID_FRAGMENTS])
def test_adapter_schema_accepts_valid_fragments(_name: str, schema: Path, content: str, tmp_path: Path) -> None:
    """Validate representative XML fragments for each adapter schema."""

    # Build and validate the fragment against its adapter schema.
    element = element_from_file(tmp_path, content, schema)
    element.validate()


@pytest.mark.parametrize(("_name", "schema", "content"), INVALID_FRAGMENTS, ids=[case[0] for case in INVALID_FRAGMENTS])
def test_adapter_schema_rejects_invalid_fragments(_name: str, schema: Path, content: str, tmp_path: Path) -> None:
    """Reject representative invalid XML fragments through adapter schemas."""

    # Build the invalid fragment against its adapter schema.
    element = element_from_file(tmp_path, content, schema)

    # Require schema validation to reject the fragment.
    with pytest.raises(ValueError):
        element.validate()
