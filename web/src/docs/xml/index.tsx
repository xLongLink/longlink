import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { P } from '@/components/ui/p';

/** Renders the XML pages overview. */
export default function XmlOverviewPage() {
    return (
        <article className="space-y-8">
            <section className="space-y-4">
                <Heading level="h1" className="text-foreground">XML Pages</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels,
                    dashboards, and internal tools. Each <Code>.xml</Code> file is the source of truth for layout,
                    bindings, and actions.
                </P>
                <P className="max-w-3xl text-muted-foreground">
                    The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data
                    after invalidation.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`[uv]
uv run longlink docs`}</code>
                </pre>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`[pip]
longlink docs`}</code>
                </pre>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;longlink&gt;</Code> as the root page shell.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<?xml-model href="https://docs.longlink.dev/schema.xsd" schematypens="http://www.w3.org/2001/XMLSchema"?>
<longlink>
  <P>Hello world</P>
</longlink>`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="state" level="h2" className="text-foreground">State</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;State /&gt;</Code> to create a local reactive slot. Use <Code>id</Code> to name the
                    slot, and seed the state with any additional attributes. Those attributes become fields on that
                    state object. Attribute values are parsed as JSON when possible, otherwise they are evaluated as
                    expressions. <Code>&lt;State&gt;</Code> does not accept children.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<State id="user" value="name" />`}</code>
                </pre>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<State id="filters" search="Revenue" page="1" />`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="if" level="h2" className="text-foreground">if</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>if</Code> on any supported XML element except <Code>&lt;longlink&gt;</Code> to render
                    conditionally.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"<P if=\"${order.active}\">Active</P>"}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="query" level="h2" className="text-foreground">Query</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;Query /&gt;</Code> to fetch JSON into a named slot, where the <Code>id</Code>
                    attribute names the query slot and the <Code>path</Code> attribute points at the JSON endpoint or
                    absolute URL. <Code>&lt;Query&gt;</Code> does not accept children.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Query id="products" path="/api/products" />`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="action" level="h2" className="text-foreground">Action</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>&lt;Action /&gt;</Code> to submit a request from an XML page. Use <Code>action</Code> to
                    set the target endpoint. Use <Code>method</Code> to set the HTTP method when needed.{' '}
                    <Code>&lt;Action&gt;</Code> can include content as its label.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"<Action action=\"/issues\" json='${{ title: issue.title }}'>\n"}
                        {'  Save issue\n'}
                        {'</Action>'}
                    </code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="expressions" level="h2" className="text-foreground">Expressions</Heading>
                <P className="max-w-3xl text-muted-foreground">
                    Use <Code>{'${count}'}</Code> for wrapped expressions that return typed values.
                </P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"<P>Current products, ${products.total}</P>"}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="references" level="h2" className="text-foreground">References</Heading>
                <P className="max-w-3xl text-muted-foreground">Use <Code>$name</Code> for direct references.</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{`<Input value="$user">`}</code>
                </pre>
            </section>

            <section className="space-y-4">
                <Heading id="for" level="h2" className="text-foreground">For</Heading>
                <P className="max-w-3xl text-muted-foreground">Use <Code>For</Code> to render one child scope for each item in an array.</P>
                <pre className="overflow-x-auto rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <code>{"<For each=\"${products.items}\" as=\"product\">\n"}
                        {'  <P>${product.name}</P>\n'}
                        {'</For>'}
                    </code>
                </pre>
            </section>
        </article>
    );
}
