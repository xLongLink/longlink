import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

type ElementDoc = {
    name: string;
    id: string;
    description: string;
    parameters: string[];
    example: string;
};

const layoutDocs: ElementDoc[] = [
    {
        name: 'Columns',
        id: 'columns',
        description: 'Creates a responsive horizontal layout from immediate Column children.',
        parameters: ['No parameters. Use Column width values to control the layout.'],
        example: `<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>`,
    },
    {
        name: 'Column',
        id: 'column',
        description:
            'Defines one section inside Columns. Widths are relative, so sibling widths should usually add up to 100.',
        parameters: ['width: optional relative width. Defaults to 100 when omitted.'],
        example: `<Column width="40">
  <Card>Details</Card>
</Column>`,
    },
    {
        name: 'Grid',
        id: 'grid',
        description: 'Arranges children in equal columns or a custom CSS grid template.',
        parameters: ['columns: optional number of equal columns or a CSS grid-template-columns value.'],
        example: `<Grid columns="3">
  <Card>Open</Card>
  <Card>Blocked</Card>
  <Card>Done</Card>
</Grid>`,
    },
    {
        name: 'Stack',
        id: 'stack',
        description: 'Stacks child elements vertically with consistent spacing.',
        parameters: ['No parameters.'],
        example: `<Stack>
  <H2>Customer</H2>
  <P>Account details and contacts.</P>
</Stack>`,
    },
    {
        name: 'Flex',
        id: 'flex',
        description: 'Places children in a row and controls horizontal distribution.',
        parameters: ['space: optional center, around, evenly, or between.'],
        example: `<Flex space="between">
  <Button variant="outline">Cancel</Button>
  <Button>Save</Button>
</Flex>`,
    },
    {
        name: 'Card',
        id: 'card',
        description: 'Groups related content in a bordered card surface.',
        parameters: ['size: optional card spacing size. Defaults to default.'],
        example: `<Card size="sm">
  <H3>Order #1248</H3>
  <P>Waiting for warehouse confirmation.</P>
</Card>`,
    },
    {
        name: 'Hero',
        id: 'hero',
        description: 'Creates a prominent page introduction with optional icon, description, and action slot.',
        parameters: ['icon: optional Lucide icon name rendered near the title.'],
        example: `<Hero icon="layout-grid">
  <HeroTitle>Operations</HeroTitle>
  <HeroDescription>Track the live work queue.</HeroDescription>
  <HeroAction>
    <Button>New order</Button>
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
  <Button>Create</Button>
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
  <Tab value="overview" label="Overview">
    <P>Summary content</P>
  </Tab>
  <Tab value="activity" label="Activity" icon="list">
    <P>Recent updates</P>
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
        example: `<Tab value="billing" label="Billing" if="user.canManageBilling">
  <P>Invoice settings</P>
</Tab>`,
    },
    {
        name: 'Dialog',
        id: 'dialog',
        description: 'Creates an overlay dialog for focused actions and confirmations.',
        parameters: ['open: optional controlled open state expression. Omit it for trigger-managed dialogs.'],
        example: `<Dialog>
  <DialogTrigger>
    <Button variant="outline">Delete</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Delete order</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
  </DialogContent>
</Dialog>`,
    },
    {
        name: 'DialogTrigger',
        id: 'dialogtrigger',
        description: 'Trigger slot that opens a Dialog. Single Button or A children are wired as the trigger element.',
        parameters: ['No parameters.'],
        example: `<DialogTrigger>
  <Button>Open details</Button>
</DialogTrigger>`,
    },
    {
        name: 'DialogContent',
        id: 'dialogcontent',
        description: 'Content panel displayed inside a Dialog overlay.',
        parameters: ['No parameters.'],
        example: `<DialogContent>
  <DialogTitle>Confirm change</DialogTitle>
  <P>Review the change before saving.</P>
</DialogContent>`,
    },
    {
        name: 'DialogTitle',
        id: 'dialogtitle',
        description: 'Accessible title for DialogContent.',
        parameters: ['No parameters.'],
        example: `<DialogTitle>Confirm change</DialogTitle>`,
    },
    {
        name: 'DialogDescription',
        id: 'dialogdescription',
        description: 'Accessible supporting description for DialogContent.',
        parameters: ['No parameters.'],
        example: `<DialogDescription>This action updates the customer record.</DialogDescription>`,
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
    <P>Today\'s snapshot.</P>
  </MenuSection>
  <MenuSection value="settings" label="Settings" icon="settings">
    <P>Workspace configuration.</P>
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
  <P>Monthly reporting.</P>
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
  <P>Orders still in progress.</P>
</MenuSubSection>`,
    },
];

/** Renders one XML element reference entry. */
function ElementSection({ element }: { element: ElementDoc }) {
    return (
        <section className="space-y-3">
            <Heading id={element.id} level="h2">
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
            {layoutDocs.map((element) => (
                <ElementSection key={element.id} element={element} />
            ))}
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-06-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/layout.tsx',
};

export const content = <LayoutContent />;
