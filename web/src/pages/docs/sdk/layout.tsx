import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-02',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/layout.tsx',
};

export const content = (
    <Stack>
        <Heading id="layout" level="h1">
            Layout
        </Heading>
        <P>Layout elements organize XML page content into responsive sections, cards, dialogs, tabs, and menus.</P>
        <Stack>
            <Heading id="columns-elements" level="h2">
                Columns
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="columns" level="h3">
                        Columns
                    </Heading>
                    <P>Creates a responsive horizontal layout from immediate Column children.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters. Use Column width values to control the layout.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Columns>
  <Column width="70"><P i18n="layout.main" /></Column>
  <Column width="30"><P i18n="layout.sidebar" /></Column>
</Columns>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="column" level="h3">
                        Column
                    </Heading>
                    <P>
                        Defines one section inside Columns. Widths are relative, so sibling widths should usually add up
                        to 100.
                    </P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>width: optional relative width. Defaults to 100 when omitted.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Column width="40">
  <Card>
    <P i18n="orders.details" />
  </Card>
</Column>`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack className="gap-3">
            <Heading id="grid" level="h2">
                Grid
            </Heading>
            <P>Arranges children in equal columns or a custom CSS grid template.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>columns: optional number of equal columns or a CSS grid-template-columns value.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Grid columns="3">
  <Card><Badge i18n="orders.open" /></Card>
  <Card><Badge i18n="orders.blocked" /></Card>
  <Card><Badge i18n="orders.done" /></Card>
</Grid>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="stack" level="h2">
                Stack
            </Heading>
            <P>Stacks child elements vertically with consistent spacing.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>No parameters.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Stack>
  <H2 i18n="customers.title" />
  <P i18n="customers.description" />
</Stack>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="flex" level="h2">
                Flex
            </Heading>
            <P>Places children in a row and controls horizontal distribution.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>space: optional center, around, evenly, or between.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Flex space="between">
  <Button variant="outline" i18n="actions.cancel" />
  <Button i18n="actions.save" />
</Flex>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="card" level="h2">
                Card
            </Heading>
            <P>Groups related content in a bordered card surface.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>size: optional card spacing size. Defaults to default.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Card size="sm">
  <H3 i18n="orders.cardTitle" number="order.number" />
  <P i18n="orders.waitingForWarehouse" />
</Card>`}</CodeBlock>
        </Stack>
        <Stack>
            <Heading id="hero-elements" level="h2">
                Hero
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="hero" level="h3">
                        Hero
                    </Heading>
                    <P>Creates a prominent page introduction with optional icon, description, and action slot.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>icon: optional Lucide icon name rendered near the title.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Hero icon="layout-grid">
  <HeroTitle i18n="operations.title" />
  <HeroDescription i18n="operations.description" />
  <HeroAction>
    <Button i18n="orders.new" />
  </HeroAction>
</Hero>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="herotitle" level="h3">
                        HeroTitle
                    </Heading>
                    <P>Title slot for Hero.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key for localized title text.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<HeroTitle i18n="orders.hero.title" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="herodescription" level="h3">
                        HeroDescription
                    </Heading>
                    <P>Supporting text slot for Hero.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>i18n: optional translation key for localized description text.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<HeroDescription i18n="orders.hero.description" />`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="heroaction" level="h3">
                        HeroAction
                    </Heading>
                    <P>Action slot aligned with the Hero content.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters. Place buttons or links inside it.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<HeroAction>
  <Button i18n="actions.create" />
</HeroAction>`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="tabs-elements" level="h2">
                Tabs
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="tabs" level="h3">
                        Tabs
                    </Heading>
                    <P>Switches between related panels collected from immediate Tab children.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>defaultValue: optional initially selected tab value.</Li>
                            <Li>orientation: optional horizontal or vertical. Defaults to horizontal.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Tabs defaultValue="overview">
  <Tab value="overview" i18n="tabs.overview">
    <P i18n="orders.summary" />
  </Tab>
  <Tab value="activity" i18n="tabs.activity" icon="list">
    <P i18n="orders.activity" />
  </Tab>
</Tabs>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="tab" level="h3">
                        Tab
                    </Heading>
                    <P>
                        Defines one panel inside Tabs. It can also render its children directly when used outside Tabs.
                    </P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: required inside Tabs.</Li>
                            <Li>label or i18n: required inside Tabs for trigger text.</Li>
                            <Li>icon: optional Lucide icon name.</Li>
                            <Li>if: optional condition to hide the tab.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Tab value="billing" i18n="tabs.billing" if="user.canManageBilling">
  <P i18n="billing.settings" />
</Tab>`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="dialog-elements" level="h2">
                Dialog
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="dialog" level="h3">
                        Dialog
                    </Heading>
                    <P>Creates an overlay dialog for focused actions and confirmations.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>
                                open: optional controlled open state expression. Omit it for trigger-managed dialogs.
                            </Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Dialog>
  <DialogTrigger>
    <Button variant="outline" i18n="actions.delete" />
  </DialogTrigger>
  <DialogContent>
    <DialogTitle><P i18n="orders.deleteTitle" /></DialogTitle>
    <DialogDescription><P i18n="orders.deleteDescription" /></DialogDescription>
  </DialogContent>
</Dialog>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="dialogtrigger" level="h3">
                        DialogTrigger
                    </Heading>
                    <P>
                        Trigger slot that opens a Dialog. Single Button or A children are wired as the trigger element.
                    </P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DialogTrigger>
  <Button i18n="actions.openDetails" />
</DialogTrigger>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="dialogcontent" level="h3">
                        DialogContent
                    </Heading>
                    <P>Content panel displayed inside a Dialog overlay.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DialogContent>
  <DialogTitle><P i18n="actions.confirmChange" /></DialogTitle>
  <P i18n="actions.reviewBeforeSaving" />
</DialogContent>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="dialogtitle" level="h3">
                        DialogTitle
                    </Heading>
                    <P>Accessible title for DialogContent.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DialogTitle><P i18n="actions.confirmChange" /></DialogTitle>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="dialogdescription" level="h3">
                        DialogDescription
                    </Heading>
                    <P>Accessible supporting description for DialogContent.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>No parameters.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<DialogDescription><P i18n="customers.updateDescription" /></DialogDescription>`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
        <Stack>
            <Heading id="menu-elements" level="h2">
                Menu
            </Heading>
            <Stack>
                <Stack className="gap-3">
                    <Heading id="menu" level="h3">
                        Menu
                    </Heading>
                    <P>Creates sectioned navigation where each section owns a content panel.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>defaultValue: optional initial section value.</Li>
                            <Li>value: optional controlled active section value.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<Menu defaultValue="overview">
  <MenuSection value="overview" label="Overview" icon="layout-grid">
    <P i18n="dashboard.snapshot" />
  </MenuSection>
  <MenuSection value="settings" label="Settings" icon="settings">
    <P i18n="settings.description" />
  </MenuSection>
</Menu>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="menusection" level="h3">
                        MenuSection
                    </Heading>
                    <P>Top-level selectable section inside Menu.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: required section id.</Li>
                            <Li>label or i18n: optional visible label.</Li>
                            <Li>icon: optional Lucide icon name.</Li>
                            <Li>disabled: optional boolean.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<MenuSection value="reports" label="Reports" icon="bar-chart">
  <P i18n="reports.monthly" />
</MenuSection>`}</CodeBlock>
                </Stack>
                <Stack className="gap-3">
                    <Heading id="menusubsection" level="h3">
                        MenuSubSection
                    </Heading>
                    <P>Nested selectable section inside a MenuSection.</P>
                    <Stack className="gap-2">
                        <P className="font-medium text-foreground">Parameters</P>
                        <Ul>
                            <Li>value: required subsection id.</Li>
                            <Li>label or i18n: optional visible label.</Li>
                            <Li>disabled: optional boolean.</Li>
                        </Ul>
                    </Stack>
                    <CodeBlock language="xml">{`<MenuSubSection value="open" label="Open orders">
  <P i18n="orders.openDescription" />
</MenuSubSection>`}</CodeBlock>
                </Stack>
            </Stack>
        </Stack>
    </Stack>
);
