import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';
import { Window } from '@/components/Window';

/** Renders the XML pages overview. */
export default function XmlOverviewPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">
                    XML Pages
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels,
                    dashboards, and internal tools. Each <Code>.xml</Code> file is the source of truth for layout,
                    bindings, and actions.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data
                    after invalidation.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;longlink&gt;</Code> as the root page shell.
                </P>
                <Window>{`<State id="user" value="name" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="if" level="h2" className="text-foreground">
                    if
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>if</Code> on any supported XML element except <Code>&lt;longlink&gt;</Code> to render
                    conditionally.
                </P>
                <Window>{`<P if="${'${order.active}'}">Active</P>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="query" level="h2" className="text-foreground">
                    Query
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;Query /&gt;</Code> to fetch JSON into a named slot, where the <Code>id</Code>
                    attribute names the query slot and the <Code>path</Code> attribute points at the JSON endpoint or
                    absolute URL. <Code>&lt;Query&gt;</Code> does not accept children.
                </P>
                <Window>{`<Query id="products" path="/api/products" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="action" level="h2" className="text-foreground">
                    Action
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;Action /&gt;</Code> to submit a request from an XML page. Use <Code>action</Code> to
                    set the target endpoint. Use <Code>method</Code> to set the HTTP method when needed.{' '}
                    <Code>&lt;Action&gt;</Code> can include content as its label.
                </P>
                <Window>{`<Action action="/issues" method="POST">Save issue</Action>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="expressions" level="h2" className="text-foreground">
                    Expressions
                </Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>{'${count}'}</Code> for wrapped expressions that return typed values.
                </P>
                <Window>{`<P>Current products, ${'${products.total}'}</P>`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="references" level="h2" className="text-foreground">
                    References
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Use <Code>$name</Code> for direct references.</P>
                <Window>{`<Input value="$user" />`}</Window>
            </section>

            <section className="space-y-4">
                <Heading id="for" level="h2" className="text-foreground">
                    For
                </Heading>
                <P className="max-w-3xl text-muted-foreground">Use <Code>For</Code> to render one child scope for each item in an array.</P>
                <Window>{`<For each="${'${products.items}'}" as="product"><P>${'${product.name}'}</P></For>`}</Window>
            </section>
        </article>
    );
}
