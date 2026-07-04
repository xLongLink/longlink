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
    ("a", _adapter_schema("a.xsd"), '<A to="/issues/123" i18n="issues.open" />'),
    ("action", _adapter_schema("Action.xsd"), '<Action action="/profile" method="PATCH" json="${profile}"><Button i18n="actions.save" /></Action>'),
    ("avatar", _adapter_schema("Avatar.xsd"), '<Avatar size="sm"><AvatarImage src="/ada.png" alt="Ada Lovelace" /><AvatarFallback><P i18n="users.initials" /></AvatarFallback></Avatar>'),
    ("badge", _adapter_schema("Badge.xsd"), '<Badge value="$item.status" />'),
    ("br", _adapter_schema("br.xsd"), '<Br />'),
    ("button", _adapter_schema("Button.xsd"), '<Button append="cart" item="${item}" submit="true" variant="outline" size="sm" if="${canSave}" i18n="actions.save" />'),
    ("button-group", _adapter_schema("ButtonGroup.xsd"), '<ButtonGroup orientation="horizontal"><Button variant="outline" i18n="actions.cancel" /><Input value="Search" /><ButtonGroupSeparator orientation="vertical" /><ButtonGroupText i18n="actions.quick" /></ButtonGroup>'),
    ("button-group-separator", _adapter_schema("ButtonGroupSeparator.xsd"), '<ButtonGroupSeparator orientation="horizontal" />'),
    ("button-group-text", _adapter_schema("ButtonGroupText.xsd"), '<ButtonGroupText i18n="actions.quick" />'),
    ("card", _adapter_schema("Card.xsd"), '<Card><P i18n="cards.content" /></Card>'),
    ("checkbox", _adapter_schema("Checkbox.xsd"), '<Checkbox checked="true" defaultChecked="false" disabled="true" if="canEdit" />'),
    ("columns", _adapter_schema("Columns.xsd"), '<Columns><Column width="70"><P i18n="layout.main" /></Column><Column width="30"><P i18n="layout.sidebar" /></Column></Columns>'),
    ("dialog", _adapter_schema("Dialog.xsd"), '<Dialog open="true"><DialogTrigger><Button i18n="dialog.open" /></DialogTrigger><DialogContent><DialogTitle><P i18n="issues.deleteTitle" /></DialogTitle><DialogDescription><P i18n="issues.deleteDescription" /></DialogDescription></DialogContent></Dialog>'),
    ("field", _adapter_schema("Field.xsd"), '<Field><FieldLabel htmlFor="name" i18n="users.fullName" /><Input id="name" autoComplete="off" /></Field>'),
    ("flex", _adapter_schema("Flex.xsd"), '<Flex space="between"><P i18n="users.name" /><Badge i18n="status.live" /></Flex>'),
    ("for", _adapter_schema("For.xsd"), '<For each="items" as="item"><P i18n="items.name" /></For>'),
    ("hero", _adapter_schema("Hero.xsd"), '<Hero icon="layout-grid"><HeroTitle i18n="orgs.title" /><HeroDescription i18n="orgs.description" /><HeroContent><Button i18n="orgs.create" /></HeroContent></Hero>'),
    ("hr", _adapter_schema("Hr.xsd"), '<Hr />'),
    ("icon", _adapter_schema("Icon.xsd"), '<Icon name="layout-grid" if="show" />'),
    ("input", _adapter_schema("Input.xsd"), '<Input placeholder="Draft title" value="Draft" type="text" if="isEditable" />'),
    ("input-group", _adapter_schema("InputGroup.xsd"), '<InputGroup><InputGroupAddon><P i18n="symbols.at" /></InputGroupAddon><InputGroupInput label="Handle" value="user.handle" /><InputGroupButton type="button" i18n="actions.search" /><InputGroupText i18n="visibility.public" /></InputGroup>'),
    ("input-group-addon", _adapter_schema("InputGroupAddon.xsd"), '<InputGroupAddon align="inline-end"><P i18n="symbols.at" /></InputGroupAddon>'),
    ("input-group-button", _adapter_schema("InputGroupButton.xsd"), '<InputGroupButton size="xs" variant="ghost" type="submit" i18n="actions.save" />'),
    ("input-group-input", _adapter_schema("InputGroupInput.xsd"), '<InputGroupInput label="Handle" value="user.handle" type="text" if="canEdit" />'),
    ("input-group-text", _adapter_schema("InputGroupText.xsd"), '<InputGroupText i18n="visibility.public" />'),
    ("input-group-textarea", _adapter_schema("InputGroupTextarea.xsd"), '<InputGroupTextarea label="Notes" rows="4" cols="40" value="Draft notes" />'),
    ("label", _adapter_schema("Label.xsd"), '<Label htmlFor="newsletter" if="canEdit" i18n="settings.newsletter" />'),
    ("li", _adapter_schema("li.xsd"), '<Li value="${item.name}" />'),
    ("longlink", _adapter_schema("Longlink.xsd"), '<longlink name="dashboard" icon="layout-dashboard"><P i18n="dashboard.title" /></longlink>'),
    ("menu", _adapter_schema("Menu.xsd"), '<Menu defaultValue="overview"><MenuSection value="overview" label="Overview" icon="layout-grid"><P i18n="overview.content" /></MenuSection></Menu>'),
    ("p", _adapter_schema("p.xsd"), '<P value="$item.name" />'),
    ("query", _adapter_schema("Query.xsd"), '<Query id="projects" path="/projects" />'),
    ("select", _adapter_schema("Select.xsd"), '<Select defaultValue="overview"><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectLabel i18n="views.label" /><SelectItem value="overview" i18n="views.overview" /></SelectGroup></SelectContent></Select>'),
    ("stack", _adapter_schema("Stack.xsd"), '<Stack><P i18n="stack.first" /><P i18n="stack.second" /></Stack>'),
    ("state", _adapter_schema("State.xsd"), '<State id="filters" value="[]" />'),
    ("switch", _adapter_schema("Switch.xsd"), '<Switch checked="true" defaultChecked="false" disabled="true" size="sm" if="canEdit" />'),
    ("table", _adapter_schema("Table.xsd"), '<Table><TableHeader><TableRow><TableHead i18n="quarters.header" /></TableRow></TableHeader><TableBody><TableRow><TableCell i18n="quarters.q1" /></TableRow></TableBody></Table>'),
    ("data-table", _adapter_schema("Table.xsd"), '<DataTable data="$items" as="item" empty="No items"><DataColumn field="sku" header="SKU" /></DataTable>'),
    ("tabs", _adapter_schema("Tabs.xsd"), '<Tabs default="overview"><Tab value="overview" label="Overview" icon="layout-grid"><P i18n="tabs.overviewPanel" /></Tab></Tabs>'),
    ("textarea", _adapter_schema("Textarea.xsd"), '<Textarea label="Notes" rows="4" cols="40" value="Draft notes" if="canEdit" />'),
    ("toggle", _adapter_schema("Toggle.xsd"), '<Toggle pressed="true" defaultPressed="false" disabled="true" size="sm" variant="outline" if="canEdit" />'),
    ("toggle-group", _adapter_schema("ToggleGroup.xsd"), '<ToggleGroup type="single" orientation="horizontal" size="sm"><ToggleGroupItem value="a"><P i18n="options.a" /></ToggleGroupItem></ToggleGroup>'),
]

INVALID_FRAGMENTS = [
    ("unknown-action-attribute", _adapter_schema("Action.xsd"), '<Action tone="accent"><Button i18n="actions.save" /></Action>'),
    ("unknown-button-attribute", _adapter_schema("Button.xsd"), '<Button href="/issues" i18n="actions.open" />'),
    ("missing-column-width", _adapter_schema("Columns.xsd"), '<Columns><Column><P i18n="layout.main" /></Column></Columns>'),
    ("invalid-flex-space", _adapter_schema("Flex.xsd"), '<Flex space="stretch"><P i18n="users.name" /></Flex>'),
    ("missing-for-as", _adapter_schema("For.xsd"), '<For each="items" />'),
    ("unknown-longlink-attribute", _adapter_schema("Longlink.xsd"), '<longlink hidden="true"><P i18n="dashboard.title" /></longlink>'),
    ("invalid-child-through-root", ROOT_SCHEMA, '<longlink><Action tone="accent"><Button i18n="actions.save" /></Action></longlink>'),
    ("missing-menu-section-value", _adapter_schema("Menu.xsd"), '<Menu><MenuSection i18n="menu.first" /></Menu>'),
    ("lowercase-p", _adapter_schema("p.xsd"), '<p i18n="copy.paragraph" />'),
    ("missing-query-path", _adapter_schema("Query.xsd"), '<Query id="projects" />'),
    ("missing-state-id", _adapter_schema("State.xsd"), '<State value="[]" />'),
    ("missing-data-table-data", _adapter_schema("Table.xsd"), '<DataTable><DataColumn field="sku" header="SKU" /></DataTable>'),
    ("missing-tab-value", _adapter_schema("Tabs.xsd"), '<Tabs><Tab label="Overview"><P i18n="tabs.overview" /></Tab></Tabs>'),
    ("malformed-longlink", _adapter_schema("Longlink.xsd"), '<longlink><P i18n="dashboard.title"></longlink>'),
]


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
