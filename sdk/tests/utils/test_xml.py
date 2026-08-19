import pytest
from longlink.utils.xml import validate_xml

VALID_FRAGMENTS = [
    (
        "action",
        '<Action><Request url="/profile" method="PATCH" json="${profile}" /><Patch state="profile" value="${profile}" /><Patch state="profile" invalidate="true" /><Button label="Save" /></Action>',
    ),
    ("avatar", '<Avatar src="/ada.png" name="Ada Lovelace" />'),
    ("badge", '<Badge>$item.status<Icon slot="icon" icon="check" /></Badge>'),
    (
        "button",
        '<Button label="Save" type="submit" variant="primary" size="sm" elevation="low" isInterruptible="true" if="${canSave}" />',
    ),
    ("card", '<Card>Card content</Card>'),
    (
        "checkbox-input",
        '<CheckboxInput label="Archive" value="$form.archive" isDisabled="false" size="sm" isLoading="true" />',
    ),
    (
        "dialog",
        '<Dialog title="Delete issue" triggerLabel="Open" isOpen="$dialog.value" purpose="form">This action cannot be undone.</Dialog>',
    ),
    ("divider", '<Divider>or</Divider>'),
    ("divider-runtime-attributes", '<Divider if="show" slot="content" />'),
    ("file-input", '<FileInput label="Document" value="$document.file" accept=".pdf" mode="dropzone" />'),
    ("for", '<For each="items" as="item">$item.name</For>'),
    (
        "form-layout",
        '<Stack><TextInput label="Name" /><NumberInput label="Quantity" /></Stack>',
    ),
    ("grid", '<Grid minColumnWidth="240" maxColumns="3"><Card /></Grid>'),
    (
        "heading",
        '<Heading level="1" type="display-1" accessibilityLevel="2" color="accent" display="inline" maxLines="2" hasTruncateTooltip="below" wordBreak="break-word" textWrap="balance" justify="center" hasCapsize="true" hasStrikethrough="true" id="dashboard-heading">Dashboard</Heading>',
    ),
    ("icon", '<Icon icon="info" if="show" />'),
    ("link", '<Link to="/issues/123">Open issue</Link>'),
    ("longlink", '<longlink name="dashboard" icon="layout-dashboard" />'),
    (
        "number-input",
        '<NumberInput label="Quantity" value="$order.quantity" min="1" step="1" hasAutoFocus="true" labelTooltip="Enter a quantity" statusVariant="tooltip" />',
    ),
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
    ("stack", '<Stack direction="horizontal" justify="between">First</Stack>'),
    ("state", '<State id="filters" value="[]" />'),
    (
        "switch",
        '<Switch label="Notifications" value="$settings.notifications" size="sm" isLoading="true" labelTooltip="Toggle notifications" labelPosition="start" />',
    ),
    (
        "table",
        '<Table data="$items" emptyLabel="No items"><TableColumn key="sku-column" field="sku" header="SKU" /></Table>',
    ),
    (
        "tabs",
        '<Tabs value="$tabs.value"><Tab value="overview" label="Overview">Overview panel</Tab></Tabs>',
    ),
    (
        "text-area",
        '<TextArea label="Notes" rows="4" value="$form.notes" isLoading="true" labelTooltip="Add notes" statusVariant="tooltip" if="canEdit" />',
    ),
    ("text-input", '<TextInput label="Name" value="$form.name" type="text" size="lg" isLoading="true" statusVariant="tooltip" />'),
]

INVALID_FRAGMENTS = [
    ("invalid-action-effect-order", '<Action><Button label="Save" /><Request url="/profile" method="PATCH" /></Action>'),
    ("invalid-heading-type", '<Heading level="1" type="headline" value="Title" />'),
    ("icon-unsupported-attribute", '<Icon icon="info" color="violet" />'),
    ("badge-label-attribute", '<Badge label="Active" />'),
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
    ("missing-tab-value", '<Tabs><Tab label="Overview">Overview</Tab></Tabs>'),
    ("malformed-longlink", '<longlink>Dashboard</longlink'),
]

UNSUPPORTED_MARKUP_FRAGMENTS = [
    ("doctype", "<!DOCTYPE longlink><longlink />"),
    ("cdata", "<longlink><![CDATA[hidden]]></longlink>"),
]


def root_document(content: str) -> str:
    """Wrap an XML component fragment in the LongLink document root."""

    # Preserve fixture documents that already exercise root attributes or markup.
    if content.startswith("<longlink"):
        return content

    return f"<longlink>{content}</longlink>"


@pytest.mark.parametrize(
    "content", [content for _, content in UNSUPPORTED_MARKUP_FRAGMENTS], ids=[case[0] for case in UNSUPPORTED_MARKUP_FRAGMENTS]
)
def test_xml_validation_rejects_unsupported_markup(content: str) -> None:
    """Reject XML markup unsupported by the browser runtime."""

    # Validate the document at the shared XML boundary.
    with pytest.raises(ValueError, match="DOCTYPE and CDATA"):
        validate_xml(content)


@pytest.mark.parametrize("content", [content for _, content in VALID_FRAGMENTS], ids=[case[0] for case in VALID_FRAGMENTS])
def test_root_schema_accepts_valid_fragments(content: str) -> None:
    """Validate representative XML fragments through the application page schema."""

    # Validate the fragment through the application page schema.
    validate_xml(root_document(content))


@pytest.mark.parametrize("content", [content for _, content in INVALID_FRAGMENTS], ids=[case[0] for case in INVALID_FRAGMENTS])
def test_root_schema_rejects_invalid_fragments(content: str) -> None:
    """Reject representative invalid XML fragments through the application page schema."""

    # Require schema validation to reject the fragment.
    with pytest.raises(ValueError):
        validate_xml(root_document(content))
