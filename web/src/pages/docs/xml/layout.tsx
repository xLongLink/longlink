import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/xml/layout.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="layout" level="h1">
            Layout
        </Heading>
        <p className="leading-7">XML layout components organize content into responsive sections and dialog-style surfaces.</p>
        <Heading id="card" level="h2">
            Card
        </Heading>
        <p className="leading-7">Cards group related content.</p>
        <CodeBlock language="xml">{`<Card size="sm">
  <P>Card Content</P>
</Card>`}</CodeBlock>
        <Heading id="columns" level="h2">
            Columns
        </Heading>
        <p className="leading-7">Columns render side-by-side sections. Column widths should add up to 100 across the row.</p>
        <CodeBlock language="xml">{`<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>`}</CodeBlock>
        <Heading id="dialog" level="h2">
            Dialog
        </Heading>
        <p className="leading-7">Dialog renders an overlay for focused actions and confirmations.</p>
        <p className="leading-7">Use a trigger to open the dialog. Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">open</code> only when you need a controlled dialog.</p>
        <CodeBlock language="xml">{`<Dialog>
  <DialogTrigger>
    <Button variant="outline">Open dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogTitle>Delete issue</DialogTitle>
    <DialogDescription>This cannot be undone.</DialogDescription>
  </DialogContent>
</Dialog>`}</CodeBlock>
        <Heading id="flex" level="h2">
            Flex
        </Heading>
        <p className="leading-7">Flex arranges children in a row and can distribute space between them.</p>
        <ul className="ml-6 list-disc space-y-2">
            <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">space=&quot;center&quot;</code> centers the group.</li>
            <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">space=&quot;around&quot;</code> adds equal space around each item.</li>
            <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">space=&quot;between&quot;</code> pushes items to the edges.</li>
            <li><code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">space=&quot;evenly&quot;</code> keeps equal spacing across the row.</li>
        </ul>
        <CodeBlock language="xml">{`<Flex space="between">
  <Button variant="outline">Cancel</Button>

  <ButtonGroup>
    <Button size="sm" variant="outline">Back</Button>
    <Button size="sm">Next</Button>
  </ButtonGroup>
</Flex>`}</CodeBlock>
        <Heading id="grid" level="h2">
            Grid
        </Heading>
        <p className="leading-7">Grid renders evenly spaced child cards or panels.</p>
        <CodeBlock language="xml">{`<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>`}</CodeBlock>
        <Heading id="menu" level="h2">
            Menu
        </Heading>
        <p className="leading-7">Menus expose sectioned navigation, nested subsections, and optional icons.</p>
        <CodeBlock language="xml">{`<Menu defaultValue="settings">
  <MenuSection value="overview" label="Overview" icon="layout-grid">
    <P>Today's snapshot.</P>
  </MenuSection>

  <MenuSection value="operations" label="Operations" icon="settings">
    <P>Live queue management.</P>

    <MenuSubSection value="orders" label="Orders">
      <P>Open orders waiting on fulfillment.</P>
    </MenuSubSection>
  </MenuSection>

  <MenuSection value="settings" label="Settings" icon="shield">
    <P>Workspace settings and permissions.</P>
  </MenuSection>
</Menu>`}</CodeBlock>
        <Heading id="stack" level="h2">
            Stack
        </Heading>
        <p className="leading-7">Stack arranges content vertically with consistent spacing.</p>
        <CodeBlock language="xml">{`<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>`}</CodeBlock>
        <Heading id="tabs" level="h2">
            Tabs
        </Heading>
        <p className="leading-7">Tabs let users switch between related panels. Tabs can also show an icon per tab.</p>
        <CodeBlock language="xml">{`<Tabs defaultValue="overview">
  <Tab value="overview" label="Overview">
    <P>Overview content</P>
  </Tab>
  <Tab value="settings" label="Settings">
    <P>Settings content</P>
  </Tab>
</Tabs>`}</CodeBlock>
    </div>
);
