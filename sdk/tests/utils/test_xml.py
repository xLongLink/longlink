import pytest
from pathlib import Path
from longlink.utils.xml import Element

VALID_FRAGMENTS = [
    (
        "action",
        '<Action action="/profile" method="PATCH" json="${profile}"><Button label="Save" /></Action>',
    ),
    ("avatar", '<Avatar size="md" src="/ada.png" name="Ada Lovelace" />'),
    ("badge", '<Badge id="item-status" label="$item.status" variant="success"><Icon slot="icon" icon="check" /></Badge>'),
    (
        "button",
        '<Button label="Save" type="submit" variant="primary" size="sm" elevation="low" isInterruptible="true" if="${canSave}" />',
    ),
    ("card", '<Card variant="muted" padding="4" elevation="low"><Text value="Card content" /></Card>'),
    (
        "checkbox-input",
        '<CheckboxInput label="Archive" value="$form.archive" isDisabled="false" size="sm" isLoading="true" />',
    ),
    (
        "dialog",
        '<Dialog title="Delete issue" triggerLabel="Open" isOpen="$dialog.value" purpose="form"><Text value="This action cannot be undone." /></Dialog>',
    ),
    ("divider", '<Divider label="or" variant="strong" />'),
    ("divider-runtime-attributes", '<Divider if="show" slot="content" />'),
    ("file-input", '<FileInput label="Document" value="$document.file" accept=".pdf" mode="dropzone" />'),
    ("for", '<For each="items" as="item"><Text value="$item.name" /></For>'),
    (
        "form-layout",
        '<FormLayout direction="horizontal"><TextInput label="Name" /><NumberInput label="Quantity" /></FormLayout>',
    ),
    ("grid", '<Grid minColumnWidth="240" maxColumns="3" gap="4" rowHeight="32"><Card /></Grid>'),
    (
        "heading",
        '<Heading level="1" type="display-1" accessibilityLevel="2" color="accent" display="inline" maxLines="2" hasTruncateTooltip="below" wordBreak="break-word" textWrap="balance" justify="center" hasCapsize="true" hasStrikethrough="true" id="dashboard-heading">Dashboard</Heading>',
    ),
    ("icon", '<Icon icon="info" size="sm" if="show" />'),
    ("link", '<Link to="/issues/123"><Text value="Open issue" /></Link>'),
    ("longlink", '<longlink name="dashboard" icon="layout-dashboard" />'),
    ("number-input", '<NumberInput label="Quantity" value="$order.quantity" min="1" step="1" hasAutoFocus="true" labelTooltip="Enter a quantity" statusVariant="tooltip" />'),
    ("query", '<Query id="projects" path="/projects" />'),
    (
        "radio-list",
        '<RadioList label="Priority" value="$form.priority"><RadioListItem value="high" label="High" /></RadioList>',
    ),
    (
        "selector",
        '<Selector label="View" value="$filters.view" variant="ghost" isLoading="true" isDefaultOpen="true" labelTooltip="Select a view" placement="above" statusVariant="tooltip"><SelectorOption value="overview" label="Overview" /></Selector>',
    ),
    ("slider", '<Slider label="Volume" value="$settings.volume" min="0" max="100" />'),
    ("stack", '<Stack direction="horizontal" justify="between" gap="4"><Text value="First" /></Stack>'),
    ("state", '<State id="filters" value="[]" />'),
    ("switch", '<Switch label="Notifications" value="$settings.notifications" size="sm" isLoading="true" labelTooltip="Toggle notifications" labelPosition="start" />'),
    (
        "table",
        '<Table data="$items" emptyLabel="No items"><TableColumn key="sku-column" field="sku" header="SKU" /></Table>',
    ),
    (
        "tab-list",
        '<TabList value="$tabs.value" label="Views"><Tab value="overview" label="Overview"><Text value="Overview panel" /></Tab></TabList>',
    ),
    (
        "text",
        '<Text id="item-name" as="p" type="large" size="lg" color="accent" value="$item.name" weight="semibold" display="block" justify="center" maxLines="2" textWrap="balance" wordBreak="break-word" hasCapsize="true" hasStrikethrough="true" hasTabularNumbers="true" hasTruncateTooltip="below" />',
    ),
    ("text-area", '<TextArea label="Notes" rows="4" value="$form.notes" isLoading="true" labelTooltip="Add notes" statusVariant="tooltip" if="canEdit" />'),
    ("text-input", '<TextInput label="Name" value="$form.name" type="text" size="lg" isLoading="true" statusVariant="tooltip" />'),
]

INVALID_FRAGMENTS = [
    ("unknown-action-attribute", '<Action tone="accent"><Button label="Save" /></Action>'),
    ("invalid-heading-type", '<Heading level="1" type="headline" value="Title" />'),
    ("invalid-icon-color", '<Icon icon="info" color="violet" />'),
    ("badge-unsupported-child", '<Badge label="Active"><Text value="Active" /></Badge>'),
    ("badge-duplicate-icon", '<Badge label="Active"><Icon icon="check" /><Icon icon="x" /></Badge>'),
    ("missing-button-label", "<Button />"),
    ("missing-for-as", '<For each="items" />'),
    ("forbidden-style-through-root", '<longlink><Button label="Save" style="color: red" /></longlink>'),
    (
        "invalid-child-through-root",
        '<longlink><Action tone="accent"><Button label="Save" /></Action></longlink>',
    ),
    (
        "missing-selector-option-value",
        '<Selector label="View"><SelectorOption label="Overview" /></Selector>',
    ),
    ("missing-query-path", '<Query id="projects" />'),
    ("missing-state-id", '<State value="[]" />'),
    ("missing-table-column-key", '<Table data="$items"><TableColumn field="sku" /></Table>'),
    ("missing-tab-value", '<TabList><Tab label="Overview"><Text value="Overview" /></Tab></TabList>'),
    ("malformed-longlink", '<longlink><Text value="Dashboard"></longlink>'),
]

UNSUPPORTED_MARKUP_FRAGMENTS = [
    ("doctype", '<!DOCTYPE longlink><longlink />'),
    ("cdata", '<longlink><![CDATA[hidden]]></longlink>'),
]


@pytest.mark.parametrize(("_name", "content"), UNSUPPORTED_MARKUP_FRAGMENTS, ids=[case[0] for case in UNSUPPORTED_MARKUP_FRAGMENTS])
def test_element_validation_rejects_unsupported_markup(_name: str, content: str, tmp_path: Path) -> None:
    """Reject XML markup unsupported by the browser runtime."""

    # Build a document containing unsupported browser markup.
    path = tmp_path / "page.xml"
    path.write_text(content, encoding="utf-8")
    element = Element(path)

    # Validate the document at the shared XML boundary.
    with pytest.raises(ValueError, match="DOCTYPE, ENTITY, and CDATA"):
        element.validate()


@pytest.mark.parametrize(("_name", "content"), VALID_FRAGMENTS, ids=[case[0] for case in VALID_FRAGMENTS])
def test_root_schema_accepts_valid_fragments(_name: str, content: str, tmp_path: Path) -> None:
    """Validate representative XML fragments through the application page schema."""

    # Build and validate the fragment through the application page schema.
    path = tmp_path / "page.xml"
    path.write_text(content if content.startswith("<longlink") else f'<longlink>{content}</longlink>', encoding="utf-8")
    element = Element(path)
    element.validate()


@pytest.mark.parametrize(("_name", "content"), INVALID_FRAGMENTS, ids=[case[0] for case in INVALID_FRAGMENTS])
def test_root_schema_rejects_invalid_fragments(_name: str, content: str, tmp_path: Path) -> None:
    """Reject representative invalid XML fragments through the application page schema."""

    # Build the invalid fragment through the application page schema.
    path = tmp_path / "page.xml"
    path.write_text(content if content.startswith("<longlink") else f'<longlink>{content}</longlink>', encoding="utf-8")
    element = Element(path)

    # Require schema validation to reject the fragment.
    with pytest.raises(ValueError):
        element.validate()
