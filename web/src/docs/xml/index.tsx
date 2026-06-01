import { fromXml, RenderXML } from '@/xml';

export const metadata = {
    lastUpdated: '2026-05-26',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/docs/xml/index.tsx',
};

const ast = fromXml(`
  <Stack>
    <H1>XML Pages</H1>
    <P>LongLink XML pages define the UI for backoffice software, including CRUD screens, admin panels, dashboards, and internal tools. Each <Code>.xml</Code> file is the source of truth for layout, bindings, and actions.</P>
    <P>The runtime parses XML, resolves expressions, renders React-backed components, and refreshes data after invalidation.</P>
    <P>Use <Code>&lt;longlink&gt;</Code> as the root page shell.</P>
    <Pre lang="xml"><![CDATA[<State id="filter" value='"day"' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription>Current filter: \${filter.value}</FieldDescription>
</Field>]]></Pre>
    <H2>if</H2>
    <P>Use <Code>if</Code> on any supported XML element except <Code>&lt;longlink&gt;</Code> to render conditionally.</P>
    <Pre lang="xml"><![CDATA[<State id="filter" value='""' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription if="\${filter.value in ['if']}">Shown only when the filter is if.</FieldDescription>
</Field>]]></Pre>
    <H2>Query</H2>
    <P>Use <Code>&lt;Query /&gt;</Code> to fetch JSON into a named slot, where the <Code>id</Code> attribute names the query slot and the <Code>path</Code> attribute points at the JSON endpoint or absolute URL. <Code>&lt;Query&gt;</Code> does not accept children.</P>
    <Pre lang="xml"><![CDATA[<Query id="products" path="/api/products" />]]></Pre>
    <H2>Action</H2>
    <P>Use <Code>&lt;Action /&gt;</Code> to submit a request from an XML page. Use <Code>action</Code> to set the target endpoint. Use <Code>method</Code> to set the HTTP method when needed. <Code>&lt;Action&gt;</Code> can include content as its label.</P>
    <Pre lang="xml"><![CDATA[<Action action="/issues" method="POST">Save issue</Action>]]></Pre>
    <H2>Expressions</H2>
    <P>Use <Code>$&#123;count&#125;</Code> for wrapped expressions that return typed values.</P>
    <Pre lang="xml"><![CDATA[<P>Current products, \${products.total}</P>]]></Pre>
    <H2>State</H2>
    <P>Use <Code>&lt;State /&gt;</Code> to seed shared runtime values for sibling content, references, and loops.</P>
    <Pre lang="xml"><![CDATA[<State id="filter" value='"day"' />
<Field>
    <FieldLabel htmlFor="filter">Filter</FieldLabel>
    <Input id="filter" value="$filter.value" />
    <FieldDescription>Current filter: \${filter.value}</FieldDescription>
</Field>]]></Pre>
    <H2>References</H2>
    <P>Use <Code>$name</Code> for direct references to a state value.</P>
    <Pre lang="xml"><![CDATA[<State id="selectedProduct" name="Alpha" status="Active" />
<P>Selected product: $selectedProduct.name (\${selectedProduct.status})</P>]]></Pre>
    <H2>For</H2>
    <P>Use <Code>For</Code> to render one child scope for each item in an array state or query result.</P>
    <Pre lang="xml"><![CDATA[<State id="items" value='["Alpha", "Beta"]' />
<Ul>
    <For each="\${items.value}" as="item">
        <Li>\${item}</Li>
    </For>
</Ul>]]></Pre>
  </Stack>
`);

export const content = <RenderXML ast={ast} />;
