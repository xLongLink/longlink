import pytest
from longlink.utils.xml import validate_xml

VALID_FRAGMENTS = [
    (
        "action",
        '<Action><Request url="/profile" method="PATCH" json="${profile}" /><Patch state="profile" value="${profile}" /><Patch state="profile" invalidate="true" /><Button>Save</Button></Action>',
    ),
    ("avatar", '<Avatar src="/ada.png" name="Ada Lovelace" />'),
    ("badge", '<Badge>$item.status<Icon icon="check" /></Badge>'),
    (
        "button",
        '<Button variant="primary" if="${canSave}">Save</Button>',
    ),
    ("card", "<Card>Card content</Card>"),
    (
        "checkbox-input",
        '<CheckboxInput label="Archive" value="$form.archive" />',
    ),
    (
        "dialog",
        '<Dialog title="Delete issue" triggerLabel="Open" isOpen="$dialog.value" purpose="form">This action cannot be undone.</Dialog>',
    ),
    ("divider", "<Divider>or</Divider>"),
    ("divider-runtime-attributes", '<Divider if="show" />'),
    ("file-input", '<FileInput label="Document" value="$document.file" accept=".pdf" />'),
    ("for", '<For each="items" as="item">$item.name</For>'),
    (
        "form-layout",
        '<Stack><TextInput label="Name" /><NumberInput label="Quantity" /></Stack>',
    ),
    ("grid", '<Grid minColumnWidth="240" maxColumns="3"><Card /></Grid>'),
    ("grid-span", '<Grid columns="3"><GridSpan columns="2" rows="2"><Card /></GridSpan></Grid>'),
    (
        "heading",
        '<Heading level="1">Dashboard</Heading>',
    ),
    ("icon", '<Icon icon="info" if="show" />'),
    ("link", '<Link to="/issues/123">Open issue</Link>'),
    (
        "number-input",
        '<NumberInput label="Quantity" value="$order.quantity" min="1" step="1" />',
    ),
    ("query", '<Query id="projects" path="/projects" />'),
    (
        "radio-list",
        '<RadioList label="Priority" value="$form.priority"><Option value="high" label="High" /></RadioList>',
    ),
    (
        "selector",
        '<Selector label="View" value="$filters.view"><Option value="overview" label="Overview" /></Selector>',
    ),
    ("slider", '<Slider label="Volume" value="$settings.volume" min="0" max="100" />'),
    ("stack", '<Stack direction="horizontal" justify="between"><StackItem size="fill">First</StackItem></Stack>'),
    ("state", '<State id="filters" value="[]" />'),
    (
        "switch",
        '<Switch label="Notifications" value="$settings.notifications" />',
    ),
    (
        "table",
        '<Table data="$items"><TableColumn field="sku" header="SKU" /></Table>',
    ),
    (
        "tabs",
        '<Tabs value="$tabs.value"><Tab value="overview" label="Overview">Overview panel</Tab></Tabs>',
    ),
    ("text", "<Text>Normal <b>bold</b> and <i>italic</i> text.</Text>"),
    (
        "text-area",
        '<TextArea label="Notes" value="$form.notes" if="canEdit" />',
    ),
    ("text-input", '<TextInput label="Name" value="$form.name" type="text" />'),
]

INVALID_FRAGMENTS = [
    ("invalid-action-effect-order", '<Action><Button>Save</Button><Request url="/profile" method="PATCH" /></Action>'),
    ("invalid-action-multiple-controls", '<Action><Button>Save</Button><Link to="/profile">Profile</Link></Action>'),
    ("invalid-heading-type", '<Heading level="1" type="headline" value="Title" />'),
    ("heading-id-attribute", '<Heading level="1" id="dashboard-heading">Dashboard</Heading>'),
    ("icon-unsupported-attribute", '<Icon icon="info" color="violet" />'),
    ("badge-label-attribute", '<Badge label="Active" />'),
    ("slot-attribute", '<Badge slot="icon">Active</Badge>'),
    ("button-label-attribute", '<Button label="Save">Save</Button>'),
    ("missing-for-as", '<For each="items" />'),
    ("forbidden-style", '<Button style="color: red">Save</Button>'),
    (
        "invalid-action-child",
        '<Action tone="accent"><Button>Save</Button></Action>',
    ),
    (
        "missing-option-value",
        '<Selector label="View"><Option label="Overview" /></Selector>',
    ),
    ("missing-query-path", '<Query id="projects" />'),
    ("missing-state-id", '<State value="[]" />'),
    ("missing-table-column-field", '<Table data="$items"><TableColumn header="SKU" /></Table>'),
    ("missing-tab-value", '<Tabs><Tab label="Overview">Overview</Tab></Tabs>'),
]

UNSUPPORTED_MARKUP = [
    pytest.param("<!DOCTYPE longlink><longlink />", id="doctype"),
    pytest.param(
        '<!DOCTYPE longlink [<!ENTITY xxe SYSTEM "file:///tmp/longlink-xxe-secret">]><longlink>&xxe;</longlink>',
        id="external-entity",
    ),
    pytest.param("<longlink><![CDATA[content]]></longlink>", id="cdata"),
]


def test_xml_validation_rejects_malformed_document() -> None:
    """Reject malformed XML syntax through the secure parser."""

    # Act and assert
    with pytest.raises(ValueError, match="XML syntax is invalid"):
        validate_xml("<longlink>")


@pytest.mark.parametrize("content", UNSUPPORTED_MARKUP)
def test_xml_validation_rejects_unsupported_markup(content: str) -> None:
    """Reject markup that the web runtime parser cannot support."""

    # Act
    with pytest.raises(ValueError, match="XML DOCTYPE and CDATA constructs are not supported"):
        validate_xml(content)


@pytest.mark.parametrize(
    "content", [f"<longlink>{content}</longlink>" for _, content in VALID_FRAGMENTS], ids=[case[0] for case in VALID_FRAGMENTS]
)
def test_root_schema_accepts_valid_fragments(content: str) -> None:
    """Validate representative XML fragments through the Solution View schema."""

    # Validate the fragment through the Solution View schema.
    validate_xml(content)


@pytest.mark.parametrize(
    "content", [f"<longlink>{content}</longlink>" for _, content in INVALID_FRAGMENTS], ids=[case[0] for case in INVALID_FRAGMENTS]
)
def test_root_schema_rejects_invalid_fragments(content: str) -> None:
    """Reject representative invalid XML fragments through the Solution View schema."""

    # Require schema validation to reject the fragment.
    with pytest.raises(ValueError, match="XML is invalid"):
        validate_xml(content)
