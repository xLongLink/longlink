import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';

/** Renders the XML layout page. */
export default function XmlLayoutPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">Layout</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Introduction</P>
            </section>

            <section className="space-y-4">
                <Heading id="columns" level="h2" className="text-foreground">Columns</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Columns render side-by-side sections. Column widths should add up to 100 across the row.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Columns>
  <Column width="70">Main content</Column>
  <Column width="30">Sidebar</Column>
</Columns>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="grid" level="h2" className="text-foreground">Grid</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Grid columns="3">
  <Card>One</Card>
  <Card>Two</Card>
  <Card>Three</Card>
</Grid>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="card" level="h2" className="text-foreground">Card</Heading>
                <P className="max-w-3xl text-muted-foreground">Cards group related content.</P>
                <Ul className="text-muted-foreground">
                    <Li><Code>Card</Code> renders the card shell.</Li>
                </Ul>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Card size="sm">
  <P>Card Content</P>
</Card>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="stack" level="h2" className="text-foreground">Stack</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Stack>
  <P>First</P>
  <P>Second</P>
</Stack>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="dialog" level="h2" className="text-foreground">Dialog</Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>defaultOpen</Code> to show the dialog open on first render without locking its state.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"<Dialog defaultOpen=\"${true}\">\n"}
                        {'  <DialogTrigger>\n'}
                        {'    <Button variant="outline">Open dialog</Button>\n'}
                        {'  </DialogTrigger>\n'}
                        {'  <DialogContent>\n'}
                        {'    <DialogTitle>Delete issue</DialogTitle>\n'}
                        {'    <DialogDescription>This cannot be undone.</DialogDescription>\n'}
                        {'    <Button variant="outline">Cancel</Button>\n'}
                        {'    <Action action="/issues/1" method="DELETE">Delete</Action>\n'}
                        {'  </DialogContent>\n'}
                        {'</Dialog>'}
                    </code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="tabs" level="h2" className="text-foreground">Tabs</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Tabs let users switch between related panels. Tabs can also show an icon per tab.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Tabs default="overview">
  <Tab value="overview" label="Overview" icon="layout-grid">Overview panel</Tab>
  <Tab value="settings" label="Settings">Settings panel</Tab>
</Tabs>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="menu" level="h2" className="text-foreground">Menu</Heading>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Menu defaultValue="first">
  <MenuSection value="overview" label="Overview">
    <P>Overview content</P>
  </MenuSection>
  <MenuSection value="settings" label="Settings">
    <P>Settings content</P>
    <MenuSubSection value="profile" label="Profile">
      <P>Profile content</P>
    </MenuSubSection>
    <MenuSubSection value="billing" label="Billing">
      <P>Billing content</P>
    </MenuSubSection>
  </MenuSection>
</Menu>`}</code>
                </pre>
            </section>
        </article>
    );
}
