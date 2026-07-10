import { Link } from 'react-router';

import { CodeBlock } from '@/components/CodeBlock';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-10',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/pages.tsx',
};

export const content = (
    <Stack>
        <Heading id="pages" level="h1">
            Pages
        </Heading>
        <P>
            Pages define the XML UI returned by SDK page handlers. The root page covers the runtime concepts shared by
            every element: state, queries, actions, loops, conditions, translations, expressions, bindings, and
            invalidation.
        </P>
        <P>
            XML page references live in the SDK pages section:{' '}
            <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/expressions">
                expressions
            </Link>
            ,{' '}
            <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/layout">
                layout elements
            </Link>{' '}
            and{' '}
            <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/components">
                component elements
            </Link>
            .
        </P>
        <Stack className="gap-3">
            <Heading id="folder-conventions" level="h2">
                Folder conventions
            </Heading>
            <P>
                SDK apps use conventional folders under <Code>src</Code>. LongLink registers these folders at startup
                when they exist, so pages and translations can be added without writing Python route code.
            </P>
            <Ul>
                <Li>
                    <Code>src/pages</Code> contains XML page files. Files are registered recursively under{' '}
                    <Code>/pages</Code>, so <Code>src/pages/admin/users.xml</Code> is served as{' '}
                    <Code>/pages/admin/users.xml</Code>, listed in <Code>/metadata.json</Code>, and available in the
                    browser at <Code>/admin/users</Code>.
                </Li>
                <Li>
                    <Code>src/i18n</Code> contains locale catalogs. JSON files are served under <Code>/i18n</Code>, so{' '}
                    <Code>src/i18n/en.json</Code> is available as <Code>/i18n/en.json</Code> for the XML runtime.
                </Li>
            </Ul>
            <CodeBlock language="text">{`src/
  pages/
    index.xml
    dashboard.xml
    issues.xml
    issues/[issue].xml
    admin/users.xml
  i18n/
    en.json`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="dynamic-pages" level="h2">
                Dynamic Pages
            </Heading>
            <P>
                Dynamic browser pages come from file names. Use square brackets around one path segment to declare a
                route parameter; the SDK keeps serving the XML file from its literal <Code>/pages</Code> path and
                exposes the derived browser route through <Code>/metadata.json</Code>.
            </P>
            <Ul>
                <Li>
                    <Code>src/pages/index.xml</Code>: browser route <Code>/</Code>.
                </Li>
                <Li>
                    <Code>src/pages/issues.xml</Code>: browser route <Code>/issues</Code>.
                </Li>
                <Li>
                    <Code>src/pages/issues/[issue].xml</Code>: browser route <Code>/issues/:issue</Code>.
                </Li>
                <Li>
                    <Code>src/pages/issues/[issue]/comments.xml</Code>: browser route{' '}
                    <Code>/issues/:issue/comments</Code>.
                </Li>
            </Ul>
            <P>
                Dynamic pages inherit their navigation tab from the first static segment, so <Code>/issues</Code> and{' '}
                <Code>/issues/123</Code> keep the same <Code>Issues</Code> tab active. Matched parameters are available
                as <Code>params</Code> in XML expressions.
            </P>
            <CodeBlock language="xml">{`<longlink>
  <Query id="issue" path="/api/issues/\${params.issue}" />
  <H1 i18n="issues.detailTitle" />
  <P i18n="issues.detailSummary" title="$issue.title" />
</longlink>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="longlink-page-and-i18n-mounts" level="h2">
                LongLink Page and I18n Mounts
            </Heading>
            <P>
                <Code>LongLink()</Code> registers XML pages and translation catalogs from conventional source folders.
                The scaffolded app uses the defaults through <Code>LongLink()</Code>, which is equivalent to mounting
                pages from <Code>src/pages</Code> at <Code>/pages</Code> and translations from <Code>src/i18n</Code> at{' '}
                <Code>/i18n</Code>.
            </P>
            <CodeBlock language="python">{`from longlink import LongLink

app = LongLink(
    pages="/pages",
    i18n="/i18n",
)`}</CodeBlock>
            <P>
                Change the paths when your application uses different source folders. For example,{' '}
                <Code>pages=&quot;/screens&quot;</Code> registers XML files from <Code>src/screens</Code> under{' '}
                <Code>/screens</Code>. Set <Code>pages=None</Code> or <Code>i18n=None</Code> when the application should
                not use the SDK-managed page or translation mounts.
            </P>
        </Stack>
        <Stack className="gap-3">
            <Heading id="page-metadata" level="h2">
                Page Metadata
            </Heading>
            <P>
                The root <Code>longlink</Code> element can define page tab metadata with <Code>name</Code> and{' '}
                <Code>icon</Code>. During page registration, the SDK reads these values and includes them in{' '}
                <Code>/metadata.json</Code> so the web runtime can render application navigation consistently.
            </P>
            <Ul>
                <Li>
                    <Code>name</Code>: readable label shown for the page tab.
                </Li>
                <Li>
                    <Code>icon</Code>: Lucide icon slug shown next to the page tab label.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<longlink name="Orders" icon="clipboard-list">
  <H1 i18n="orders.title" />
  <P i18n="orders.description" />
</longlink>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="translations" level="h2">
                Translations
            </Heading>
            <P>
                XML pages keep visible copy in translation catalogs through the <Code>i18n</Code> attribute. After
                adding or renaming translation keys in page XML, run the generator from the app root to refresh{' '}
                <Code>src/i18n/en.json</Code> while preserving existing translated values.
            </P>
            <CodeBlock language="bash">longlink translations generate</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="state" level="h2">
                State
            </Heading>
            <P>
                Declares local reactive page state before rendering. Descendant controls can read and write the state
                through XML value bindings.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>id: required literal state name.</Li>
                    <Li>
                        Any additional attribute becomes an initial state field. JSON values are parsed when possible,
                        otherwise the value is evaluated.
                    </Li>
                    <Li>State is setup-only, does not render, and cannot have children.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<State id="form" name="" active="true" />

<Field>
  <FieldLabel htmlFor="name" i18n="customers.name" />
  <FieldContent>
    <Input id="name" value="$form.name" />
  </FieldContent>
</Field>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="query" level="h2">
                Query
            </Heading>
            <P>
                Fetches JSON data for the page before rendering. The response is stored in the runtime context and can
                be used by expressions, loops, and bindings.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>id: required literal query name.</Li>
                    <Li>
                        path: required request path, resolved relative to the current app base URL and evaluated against
                        the XML runtime scope.
                    </Li>
                    <Li>Query is setup-only, does not render, and cannot have children.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Query id="orders" path="/api/orders" />

<For each="$orders.items" as="order">
  <P i18n="orders.row" number="$order.number" status="$order.status" />
</For>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="action" level="h2">
                Action
            </Heading>
            <P>Wraps a clickable trigger such as Button or Icon and sends a mutation request when it is activated.</P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>action: optional app-relative request path.</Li>
                    <Li>method: optional HTTP method. Defaults to POST.</Li>
                    <Li>json: optional expression payload sent as JSON.</Li>
                    <Li>invalidate: optional expression resolving to setup ids to refresh.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Action action="/api/orders/\${order.id}/complete" invalidate="\${['orders']}">
  <Button i18n="orders.complete" />
</Action>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="for" level="h2">
                For
            </Heading>
            <P>
                Repeats child XML for each item in an array. Every iteration gets a child scope with the item alias and
                an index value.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>each: required expression that must resolve to an array.</Li>
                    <Li>as: required local variable name for each item.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<For each="$orders.items" as="order">
  <Card>
    <H3 i18n="orders.cardTitle" index="\${index + 1}" number="$order.number" />
    <Badge i18n="orders.status" status="$order.status" />
  </Card>
</For>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="if" level="h2">
                if
            </Heading>
            <P>
                Global conditional prop supported by rendered XML nodes. When the expression is falsy, the node and its
                children are skipped.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>if: expression evaluated in the current XML runtime scope.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Badge if="$order.blocked" variant="destructive" i18n="orders.blocked" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="i18n" level="h2">
                i18n
            </Heading>
            <P>
                Global translation prop used by text-bearing elements. The value is a literal dotted key into the active
                locale bundle, not an expression.
            </P>
            <Stack className="gap-2">
                <P className="font-medium text-foreground">Parameters</P>
                <Ul>
                    <Li>i18n: dotted translation key.</Li>
                    <Li>count: optional expression used for plural translation entries.</Li>
                    <Li>{'Any additional attribute can fill {{name}} placeholders inside the translation string.'}</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<H1 i18n="orders.title" />
<P i18n="orders.count" count="\${orders.items.length}" />
<Button i18n="orders.assign" user="$assignee.name" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="expressions" level="h2">
                Expressions
            </Heading>
            <P>
                Expressions have a dedicated reference covering <Code>$</Code> bindings, <Code>{'${...}'}</Code> typed
                values, interpolation, supported operators, safe calls, and XML escaping.
            </P>
            <P>
                Read the{' '}
                <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/expressions">
                    expressions reference
                </Link>{' '}
                before writing complex conditions or action payloads.
            </P>
            <CodeBlock language="xml">{`<Input value="$form.name" />
<P i18n="orders.summary" name="$form.name" count="\${orders.items.length}" />
<Button disabled="\${form.saving || !form.name}" i18n="actions.save" />`}</CodeBlock>
        </Stack>
    </Stack>
);
