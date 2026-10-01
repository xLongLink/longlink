import pytest
from longlink.utils.view import validate_view

VALID_FRAGMENTS = [
    (
        "button-effects",
        '<Button label="Save"><Request url="/profile" method="PATCH" json="${profile}" /><Patch state="profile" value="${profile}" /><Patch state="profile" invalidate="true" /></Button>',
    ),
    ("avatar", '<Avatar src="/ada.png" name="Ada Lovelace" />'),
    ("badge", '<Badge>$item.status<Icon icon="check" if="show" /></Badge>'),
    (
        "button",
        '<Button variant="primary" if="${canSave}">Save</Button>',
    ),
    (
        "checkbox-input",
        '<CheckboxInput label="Archive" value="$form.archive" />',
    ),
    (
        "dialog",
        '<Dialog title="Delete issue" triggerLabel="Open" isOpen="$dialog.value" purpose="form">This action cannot be undone.</Dialog>',
    ),
    ("divider", "<Divider>or</Divider>"),
    ("dialog-fullscreen", '<Dialog title="Contract" fullscreen="true">Content</Dialog>'),
    ("dialog-width", '<Dialog title="Contract" width="90%">Content</Dialog>'),
    ("dialog-height", '<Dialog title="Contract" height="90vh">Content</Dialog>'),
    ("divider-runtime-attributes", '<Divider if="show" />'),
    ("file-input", '<FileInput label="Document" value="$document.file" accept=".pdf" />'),
    ("file-viewer", '<FileViewer src="/api/items/1/attachments/a.pdf" title="Contract" />'),
    ("for", '<For each="items" as="item">$item.name</For>'),
    (
        "form-layout",
        '<Stack><TextInput label="Name" /><NumberInput label="Quantity" /></Stack>',
    ),
    ("grid", '<Grid minColumnWidth="240" maxColumns="3"><Card>Card content</Card></Grid>'),
    ("grid-span", '<Grid columns="3"><GridSpan columns="2" rows="2"><Card /></GridSpan></Grid>'),
    (
        "heading",
        '<Heading level="1">Dashboard</Heading>',
    ),
    ("link", '<Link label="Create and open" to="/issues/123"><Request url="/issues" method="POST" /></Link>'),
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
    ("stack-scroll", '<Stack gap="3" height="50dvh">Content</Stack>'),
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
    ("button-request-without-url", '<Button label="Save"><Request method="PATCH" /></Button>', "url"),
    ("invalid-link-child", '<Link label="Save"><Button>Save</Button></Link>', "Button"),
    ("invalid-heading-type", '<Heading level="1" type="headline" value="Title" />', "type"),
    ("heading-id-attribute", '<Heading level="1" id="dashboard-heading">Dashboard</Heading>', "id"),
    ("icon-unsupported-attribute", '<Icon icon="info" color="violet" />', "color"),
    ("badge-label-attribute", '<Badge label="Active" />', "label"),
    ("slot-attribute", '<Badge slot="icon">Active</Badge>', "slot"),
    ("button-unsupported-attribute", '<Button label="Save" tone="accent" />', "tone"),
    ("missing-file-viewer-src", '<FileViewer title="Contract" />', "src"),
    ("missing-for-as", '<For each="items" />', "as"),
    ("forbidden-style", '<Button style="color: red">Save</Button>', "style"),
    (
        "invalid-button-child",
        '<Button label="Save"><Link to="/profile">Profile</Link></Button>',
        "Link",
    ),
    (
        "missing-option-value",
        '<Selector label="View"><Option label="Overview" /></Selector>',
        "value",
    ),
    ("missing-query-path", '<Query id="projects" />', "path"),
    ("missing-state-id", '<State value="[]" />', "id"),
    ("missing-table-column-field", '<Table data="$items"><TableColumn header="SKU" /></Table>', "field"),
    ("missing-tab-value", '<Tabs><Tab label="Overview">Overview</Tab></Tabs>', "value"),
    ("invalid-stack-spacing", '<Stack gap="7">Content</Stack>', "gap"),
]

UNSUPPORTED_MARKUP = [
    pytest.param("<!DOCTYPE view><view />", id="doctype"),
    pytest.param("<view><![CDATA[content]]></view>", id="cdata"),
]


def test_view_validation_rejects_malformed_document() -> None:
    """Reject malformed View syntax through the secure parser."""

    # Act and assert
    with pytest.raises(ValueError, match="View syntax is invalid"):
        validate_view("<view>")


@pytest.mark.parametrize("content", UNSUPPORTED_MARKUP)
def test_view_validation_rejects_unsupported_markup(content: str) -> None:
    """Reject markup that the web runtime parser cannot support."""

    # Act
    with pytest.raises(ValueError, match="View DOCTYPE, ENTITY, and CDATA constructs are not supported"):
        validate_view(content)


@pytest.mark.parametrize("content", [pytest.param(f"<view>{content}</view>", id=name) for name, content in VALID_FRAGMENTS])
def test_root_schema_accepts_valid_fragments(content: str) -> None:
    """Validate representative View fragments through the component constraints."""

    # Accept each representative fragment through the View schema.
    validate_view(content)


@pytest.mark.parametrize(
    ("content", "expected"),
    [pytest.param(f"<view>{content}</view>", expected, id=name) for name, content, expected in INVALID_FRAGMENTS],
)
def test_root_schema_rejects_invalid_fragments(content: str, expected: str) -> None:
    """Reject representative invalid View fragments through the component constraints."""

    # Act
    with pytest.raises(ValueError, match="View is invalid") as exc_info:
        validate_view(content)

    # Assert
    assert expected in str(exc_info.value)
