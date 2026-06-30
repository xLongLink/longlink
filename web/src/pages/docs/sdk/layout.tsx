import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

type ElementDoc = {
    name: string;
    id: string;
    description: string;
    parameters: string[];
    example: string;
};

type ElementDocGroup = {
    id: string;
    title: string;
    elements: ElementDoc[];
};

const elementFamilyRules: Array<[string, string]> = [
    ['column', 'Columns'],
    ['columns', 'Columns'],
    ['dialog', 'Dialog'],
    ['hero', 'Hero'],
    ['menu', 'Menu'],
    ['tabs', 'Tabs'],
    ['tab', 'Tabs'],
];

/**
 * Groups element IDs into readable families for the docs so related nodes stay together.
 */
function inferElementFamily(elementId: string): string {
    for (const [prefix, familyName] of elementFamilyRules) {
        if (elementId === prefix || elementId.startsWith(prefix)) {
            return familyName;
        }
    }

    return elementId.charAt(0).toUpperCase() + elementId.slice(1);
}

function toKebabCase(value: string): string {
    return value.replace(/\s+/g, '-').toLowerCase();
}

/**
 * Returns the layout docs grouped by element family, keeping first-seen order.
 */
function buildElementGroups(elements: ElementDoc[]): ElementDocGroup[] {
    return elements.reduce<ElementDocGroup[]>((groups, element) => {
        const familyName = inferElementFamily(element.id);
        const familyId = toKebabCase(familyName);
        const existingGroup = groups.find((group) => group.id === familyId);

        if (!existingGroup) {
            groups.push({ id: familyId, title: familyName, elements: [element] });
            return groups;
        }

        existingGroup.elements.push(element);
        return groups;
    }, []);
}

const layoutDocs: ElementDoc[] = [
    {
        name: 'Columns',
        id: 'columns',
        description: 'Creates a responsive horizontal layout from immediate Column children.',
        parameters: ['No parameters. Use Column width values to control the layout.'],
        example: `<Columns>
  <Column width="70"><P i18n="layout.main" /></Column>
  <Column width="30"><P i18n="layout.sidebar" /></Column>
</Columns>`,
    },
    {
        name: 'Column',
        id: 'column',
        description:
            'Defines one section inside Columns. Widths are relative, so sibling widths should usually add up to 100.',
        parameters: ['width: optional relative width. Defaults to 100 when omitted.'],
        example: `<Column width="40">
  <Card>
    <P i18n="orders.details" />
  </Card>
</Column>`,
    },
    {
        name: 'Grid',
        id: 'grid',
        description: 'Arranges children in equal columns or a custom CSS grid template.',
        parameters: ['columns: optional number of equal columns or a CSS grid-template-columns value.'],
        example: `<Grid columns="3">
  <Card><Badge i18n="orders.open" /></Card>
  <Card><Badge i18n="orders.blocked" /></Card>
  <Card><Badge i18n="orders.done" /></Card>
</Grid>`,
    },
    {
        name: 'Stack',
        id: 'stack',
        description: 'Stacks child elements vertically with consistent spacing.',
        parameters: ['No parameters.'],
        example: `<Stack>
  <H2 i18n="customers.title" />
  <P i18n="customers.description" />
</Stack>`,
    },
    {
        name: 'Flex',
        id: 'flex',
        description: 'Places children in a row and controls horizontal distribution.',
        parameters: ['space: optional center, around, evenly, or between.'],
        example: `<Flex space="between">
  <Button variant="outline" i18n="actions.cancel" />
  <Button i18n="actions.save" />
</Flex>`,
    },
    {
        name: 'Card',
        id: 'card',
        description: 'Groups related content in a bordered card surface.',
        parameters: ['size: optional card spacing size. Defaults to default.'],
        example: `<Card size="sm">
  <H3 i18n="orders.cardTitle" number="order.number" />
  <P i18n="orders.waitingForWarehouse" />
</Card>`,
    },
    {
        name: 'Hero',
        id: 'hero',
        description: 'Creates a prominent page introduction with optional icon, description, and action slot.',
        parameters: ['icon: optional Lucide icon name rendered near the title.'],
        example: `<Hero icon="layout-grid">
  <HeroTitle i18n="operations.title" />
  <HeroDescription i18n="operations.description" />
  <HeroAction>
    <Button i18n="orders.new" />
  </HeroAction>
</Hero>`,
    },
    {
        name: 'HeroTitle',
        id: 'herotitle',
        description: 'Title slot for Hero.',
        parameters: ['i18n: optional translation key for localized title text.'],
        example: `<HeroTitle i18n="orders.hero.title" />`,
    },
    {
        name: 'HeroDescription',
        id: 'herodescription',
        description: 'Supporting text slot for Hero.',
        parameters: ['i18n: optional translation key for localized description text.'],
        example: `<HeroDescription i18n="orders.hero.description" />`,
    },
    {
        name: 'HeroAction',
        id: 'heroaction',
        description: 'Action slot aligned with the Hero content.',
        parameters: ['No parameters. Place buttons or links inside it.'],
        example: `<HeroAction>
  <Button i18n="actions.create" />
</HeroAction>`,
    },
    {
        name: 'Tabs',
        id: 'tabs',
        description: 'Switches between related panels collected from immediate Tab children.',
        parameters: [
            'defaultValue: optional initially selected tab value.',
            'orientation: optional horizontal or vertical. Defaults to horizontal.',
        ],
        example: `<Tabs defaultValue="overview">
  <Tab value="overview" i18n="tabs.overview">
    <P i18n="orders.summary" />
  </Tab>
  <Tab value="activity" i18n="tabs.activity" icon="list">
    <P i18n="orders.activity" />
  </Tab>
</Tabs>`,
    },
    {
        name: 'Tab',
        id: 'tab',
        description: 'Defines one panel inside Tabs. It can also render its children directly when used outside Tabs.',
        parameters: [
            'value: required inside Tabs.',
            'label or i18n: required inside Tabs for trigger text.',
            'icon: optional Lucide icon name.',
            'if: optional condition to hide the tab.',
        ],
        example: `<Tab value="billing" i18n="tabs.billing" if="user.canManageBilling">
  <P i18n="billing.settings" />
</Tab>`,
    },
    {
        name: 'Dialog',
        id: 'dialog',
        description: 'Creates an overlay dialog for focused actions and confirmations.',
        parameters: ['open: optional controlled open state expression. Omit it for trigger-managed dialogs.'],
        example: `<Dialog>
  <DialogTrigger>
    <Button variant="outline" i18n="actions.delete" />
  </DialogTrigger>
  <DialogContent>
    <DialogTitle><P i18n="orders.deleteTitle" /></DialogTitle>
    <DialogDescription><P i18n="orders.deleteDescription" /></DialogDescription>
  </DialogContent>
</Dialog>`,
    },
    {
        name: 'DialogTrigger',
        id: 'dialogtrigger',
        description: 'Trigger slot that opens a Dialog. Single Button or A children are wired as the trigger element.',
        parameters: ['No parameters.'],
        example: `<DialogTrigger>
  <Button i18n="actions.openDetails" />
</DialogTrigger>`,
    },
    {
        name: 'DialogContent',
        id: 'dialogcontent',
        description: 'Content panel displayed inside a Dialog overlay.',
        parameters: ['No parameters.'],
        example: `<DialogContent>
  <DialogTitle><P i18n="actions.confirmChange" /></DialogTitle>
  <P i18n="actions.reviewBeforeSaving" />
</DialogContent>`,
    },
    {
        name: 'DialogTitle',
        id: 'dialogtitle',
        description: 'Accessible title for DialogContent.',
        parameters: ['No parameters.'],
        example: `<DialogTitle><P i18n="actions.confirmChange" /></DialogTitle>`,
    },
    {
        name: 'DialogDescription',
        id: 'dialogdescription',
        description: 'Accessible supporting description for DialogContent.',
        parameters: ['No parameters.'],
        example: `<DialogDescription><P i18n="customers.updateDescription" /></DialogDescription>`,
    },
    {
        name: 'Menu',
        id: 'menu',
        description: 'Creates sectioned navigation where each section owns a content panel.',
        parameters: [
            'defaultValue: optional initial section value.',
            'value: optional controlled active section value.',
        ],
        example: `<Menu defaultValue="overview">
  <MenuSection value="overview" label="Overview" icon="layout-grid">
    <P i18n="dashboard.snapshot" />
  </MenuSection>
  <MenuSection value="settings" label="Settings" icon="settings">
    <P i18n="settings.description" />
  </MenuSection>
</Menu>`,
    },
    {
        name: 'MenuSection',
        id: 'menusection',
        description: 'Top-level selectable section inside Menu.',
        parameters: [
            'value: required section id.',
            'label or i18n: optional visible label.',
            'icon: optional Lucide icon name.',
            'disabled: optional boolean.',
        ],
        example: `<MenuSection value="reports" label="Reports" icon="bar-chart">
  <P i18n="reports.monthly" />
</MenuSection>`,
    },
    {
        name: 'MenuSubSection',
        id: 'menusubsection',
        description: 'Nested selectable section inside a MenuSection.',
        parameters: [
            'value: required subsection id.',
            'label or i18n: optional visible label.',
            'disabled: optional boolean.',
        ],
        example: `<MenuSubSection value="open" label="Open orders">
  <P i18n="orders.openDescription" />
</MenuSubSection>`,
    },
];

const groupedLayoutDocs = buildElementGroups(layoutDocs);

/** Renders one XML element reference entry. */
function ElementSection({ element, headingLevel }: { element: ElementDoc; headingLevel: 'h2' | 'h3' }) {
    return (
        <section className="space-y-3">
            <Heading id={element.id} level={headingLevel}>
                {element.name}
            </Heading>
            <p className="leading-7">{element.description}</p>
            <div>
                <p className="font-medium text-foreground">Parameters</p>
                <ul className="ml-6 list-disc space-y-2">
                    {element.parameters.map((parameter) => (
                        <li key={parameter}>{parameter}</li>
                    ))}
                </ul>
            </div>
            <CodeBlock language="xml">{element.example}</CodeBlock>
        </section>
    );
}

/** Renders one grouped family of related layout elements. */
function LayoutGroupSection({ group }: { group: ElementDocGroup }) {
    if (group.elements.length === 1) {
        return <ElementSection element={group.elements[0]} headingLevel="h2" />;
    }

    return (
        <section className="space-y-4">
            <Heading id={`${group.id}-elements`} level="h2">
                {group.title}
            </Heading>
            <div className="space-y-4">
                {group.elements.map((element) => (
                    <ElementSection key={element.id} element={element} headingLevel="h3" />
                ))}
            </div>
        </section>
    );
}

/** Renders the XML layout element reference. */
function LayoutContent() {
    return (
        <div className="flex flex-col gap-4">
            <Heading id="layout" level="h1">
                Layout
            </Heading>
            <p className="leading-7">
                Layout elements organize XML page content into responsive sections, cards, dialogs, tabs, and menus.
            </p>
            {groupedLayoutDocs.map((group) => (
                <LayoutGroupSection key={group.id} group={group} />
            ))}
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-06-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/layout.tsx',
};

export const content = <LayoutContent />;
