import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Ul } from '@/components/ui/ul';
import { Window } from '@/components/Window';

/** Renders the XML layout page. */
export default function XmlLayoutPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    Layout
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Introduction</P>
            </section>

            <section className="space-y-4">
                <Heading id="columns" level="h2" className="text-foreground">
                    Columns
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Columns render side-by-side sections. Column widths should add up to 100 across the row.</P>
                <Window>{`<Columns><Column width="70" /><Column width="30" /></Columns>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="grid" level="h2" className="text-foreground">
                    Grid
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Grid columns="3"><Card>One</Card><Card>Two</Card><Card>Three</Card></Grid>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="card" level="h2" className="text-foreground">
                    Card
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Cards group related content.</P>
                <Ul className="text-muted-foreground">
                    <Li>
                        <Code>Card</Code> renders the card shell.
                    </Li>
                </Ul>
                <Window>{`<Card size="sm"><P>Card Content</P></Card>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="stack" level="h2" className="text-foreground">
                    Stack
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <Window>{`<Stack><P>First</P><P>Second</P></Stack>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="dialog" level="h2" className="text-foreground">
                    Dialog
                </Heading>
                <P className="max-w-3xl text-muted-foreground">TODO: Component description</P>
                <P className="max-w-3xl text-muted-foreground">
                    Use a trigger to open the dialog. Use <Code>open</Code> only when you need a controlled dialog.
                </P>
                <Window>{`<Dialog><DialogTrigger><Button variant="outline">Open dialog</Button></DialogTrigger><DialogContent><DialogTitle>Delete issue</DialogTitle><DialogDescription>This cannot be undone.</DialogDescription></DialogContent></Dialog>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="tabs" level="h2" className="text-foreground">
                    Tabs
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Tabs let users switch between related panels. Tabs can also show an icon per tab.</P>
                <Window>{`<Tabs default="overview"><Tab value="overview" /><Tab value="settings" /></Tabs>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="menu" level="h2" className="text-foreground">
                    Menu
                </Heading>
                <Window>{`<Menu defaultValue="first"><MenuSection /></Menu>`}</Window>
            </section>
        </article>
    );
}
