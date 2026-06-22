import { Window } from '@/components/Window';
import { Heading } from '@/components/ui/heading';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/xml/index.tsx',
};

export const content = (
    <div className="flex flex-col gap-4">
        <Heading id="xml-pages" level="h1">
            XML Pages
        </Heading>
        <p className="leading-7">
            LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels,
            dashboards, and internal tools. Each <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">.xml</code>{' '}
            file is the source of truth for layout, bindings, and actions.
        </p>
        <p className="leading-7">The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data after invalidation.</p>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;longlink&gt;</code> as the root page shell.
        </p>
        <Window>{`<State id="filter" value='"day"' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription>Current filter: \${filter.value}</FieldDescription>
</Field>`}</Window>
        <Heading id="if" level="h2">
            if
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">if</code> on any supported XML element except{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;longlink&gt;</code> to render conditionally.
        </p>
        <Window>{`<State id="filter" value='""' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription if="\${filter.value in ['if']}">Shown only when the filter is if.</FieldDescription>
</Field>`}</Window>
        <Heading id="query" level="h2">
            Query
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;Query /&gt;</code> to fetch JSON into a named slot, where the{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">id</code> attribute names the query slot and the{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">path</code> attribute points at the JSON endpoint or absolute URL.{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;Query&gt;</code> does not accept children.
        </p>
        <Window>{`<Query id="products" path="/api/products" />`}</Window>
        <Heading id="action" level="h2">
            Action
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;Action /&gt;</code> to submit a request from an XML page. Use{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">action</code> to set the target endpoint. Use{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">method</code> to set the HTTP method when needed.{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;Action&gt;</code> can include content as its label.
        </p>
        <Window>{`<Action action="/issues" method="POST">Save issue</Action>`}</Window>
        <Heading id="expressions" level="h2">
            Expressions
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">$&#123;count&#125;</code> for wrapped expressions that return typed values.
        </p>
        <Window>{`<P>Current products, \${products.total}</P>`}</Window>
        <Heading id="state" level="h2">
            State
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">&lt;State /&gt;</code> to seed shared runtime values for sibling content, references, and loops.
        </p>
        <Window>{`<State id="filter" value='"day"' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription>Current filter: \${filter.value}</FieldDescription>
</Field>`}</Window>
        <Heading id="references" level="h2">
            References
        </Heading>
        <p className="leading-7">Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">$name</code> for direct references to a state value.</p>
        <Window>{`<State id="selectedProduct" name="Alpha" status="Active" />
<P>Selected product: $selectedProduct.name (\${selectedProduct.status})</P>`}</Window>
        <Heading id="for" level="h2">
            For
        </Heading>
        <p className="leading-7">
            Use <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.9em] text-foreground">For</code> to render one child scope for each item in an array state or query result.
        </p>
        <Window>{`<State id="items" value='["Alpha", "Beta"]' />
<Ul>
    <For each="\${items.value}" as="item">
        <Li>\${item}</Li>
    </For>
</Ul>`}</Window>
    </div>
);
