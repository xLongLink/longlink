import type { ReactNode } from 'react';
import { Code } from '@astryxdesign/core/Code';
import { Link } from '@astryxdesign/core/Link';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { CodeBlock } from '@/components/CodeBlock';

/** Renders paragraph text in the pages reference. */
function P({ children }: { children: ReactNode }) {
    return <Text as="p">{children}</Text>;
}

/** Renders a bulleted list in the pages reference. */
function Ul({ children }: { children: ReactNode }) {
    return <List listStyle="disc">{children}</List>;
}

/** Renders one bulleted item in the pages reference. */
function Li({ children }: { children: ReactNode }) {
    return <ListItem label={<Text>{children}</Text>} />;
}

export const metadata = {
    toc: [
        { id: 'folder-conventions', label: 'Folder conventions' },
        { id: 'dynamic-pages', label: 'Dynamic Pages' },
        { id: 'longlink-page-and-i18n-mounts', label: 'LongLink Page and I18n Mounts' },
        { id: 'page-metadata', label: 'Page Metadata' },
        { id: 'translations', label: 'Translations' },
        { id: 'state', label: 'State' },
        { id: 'query', label: 'Query' },
        { id: 'action', label: 'Action' },
        { id: 'for', label: 'For' },
        { id: 'if', label: 'if' },
        { id: 'i18n', label: 'i18n' },
        { id: 'expressions', label: 'Expressions' },
    ],
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/pages.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="pages" level={1}>
            Pages
        </Heading>
        <P>
            Pages define the XML UI returned by SDK page handlers. The root page covers the runtime concepts shared by
            every element: state, queries, actions, loops, conditions, translations, expressions, bindings, and
            invalidation.
        </P>
        <P>
            XML page references live in the SDK pages section:{' '}
            <Link href="/docs/sdk/pages/expressions" type="inherit" hasUnderline>
                expressions
            </Link>
            ,{' '}
            <Link href="/docs/sdk/pages/layout" type="inherit" hasUnderline>
                layout elements
            </Link>{' '}
            and{' '}
            <Link href="/docs/sdk/pages/components" type="inherit" hasUnderline>
                component elements
            </Link>
            .
        </P>
        <Stack gap={3}>
            <Heading id="folder-conventions" level={2}>
                Folder conventions
            </Heading>
            <P>
                SDK applications use conventional folders under <Code>src</Code>. LongLink registers these folders at
                startup when they exist, so pages and translations can be added without writing Python route code.
            </P>
            <Ul>
                <Li>
                    <Code>src/pages</Code> contains XML page files. Files are registered recursively under{' '}
                    <Code>/pages</Code>, so <Code>src/pages/admin/users.xml</Code> is served as{' '}
                    <Code>/pages/admin/users.xml</Code>, listed in <Code>/pages.json</Code>, and available in the
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
        <Stack gap={3}>
            <Heading id="dynamic-pages" level={2}>
                Dynamic Pages
            </Heading>
            <P>
                Dynamic browser pages come from file names. Use square brackets around one path segment to declare a
                route parameter; the SDK keeps serving the XML file from its literal <Code>/pages</Code> path and
                exposes the derived browser route through <Code>/pages.json</Code>.
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
  <Heading level="1" i18n="issues.detailTitle" />
  <Text i18n="issues.detailSummary" values="\${{ title: issue.title }}" />
</longlink>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="longlink-page-and-i18n-mounts" level={2}>
                LongLink Page and I18n Mounts
            </Heading>
            <P>
                <Code>LongLink()</Code> registers XML pages and translation catalogs from conventional source folders.
                The scaffolded application uses the defaults through <Code>LongLink()</Code>, which is equivalent to
                mounting pages from <Code>src/pages</Code> at <Code>/pages</Code> and translations from{' '}
                <Code>src/i18n</Code> at <Code>/i18n</Code>.
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
        <Stack gap={3}>
            <Heading id="page-metadata" level={2}>
                Page Metadata
            </Heading>
            <P>
                The root <Code>longlink</Code> element can define page tab metadata with <Code>name</Code> and{' '}
                <Code>icon</Code>. During page registration, the SDK reads these values and includes them in{' '}
                <Code>/pages.json</Code> so the web runtime can render application navigation consistently.
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
  <Heading level="1" i18n="orders.title" />
  <Text as="p" i18n="orders.description" />
</longlink>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="translations" level={2}>
                Translations
            </Heading>
            <P>
                XML pages keep visible copy in translation catalogs through the <Code>i18n</Code> attribute. After
                adding or renaming translation keys in page XML, run the generator from the app root to refresh{' '}
                <Code>src/i18n/en.json</Code>. The generator sorts the dotted keys, preserves valid entries by exact
                key, and adds missing entries with an empty <Code>defaultMessage</Code>.
            </P>
            <CodeBlock language="bash">longlink translations generate</CodeBlock>
            <P>
                Application catalogs use the native Astryx catalog shape. The catalog is flat: every dotted key maps to
                an object with a required string <Code>defaultMessage</Code> and an optional string{' '}
                <Code>description</Code>. Messages use ICU syntax for interpolation and plurals. Nested catalogs, bare
                strings, double-brace placeholders, and plural-map entries are not supported.
            </P>
            <CodeBlock language="json">{`{
  "orders.assign": {
    "defaultMessage": "Assign to {user}",
    "description": "Assignment action label"
  },
  "orders.count": {
    "defaultMessage": "{count, plural, =0 {No orders} one {# order} other {# orders}}"
  },
  "orders.title": {
    "defaultMessage": "Orders"
  },
  "requests.statusRoute": {
    "defaultMessage": "PATCH /requests/'{id}'/status"
  }
}`}</CodeBlock>
            <P>ICU apostrophe quoting keeps the braces in the status route literal.</P>
        </Stack>
        <Stack gap={3}>
            <Heading id="state" level={2}>
                State
            </Heading>
            <P>
                Declares local reactive page state before rendering. Descendant controls can read and write the state
                through XML value bindings.
            </P>
            <Stack gap={2}>
                <Text as="p" weight="semibold">
                    Parameters
                </Text>
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

<FormLayout>
  <TextInput i18n="customers.name" value="$form.name" isRequired="true" />
  <CheckboxInput i18n="customers.active" value="$form.active" />
</FormLayout>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="query" level={2}>
                Query
            </Heading>
            <P>
                Fetches JSON data for the page before rendering. The response is stored in the runtime context and can
                be used by expressions, loops, and bindings.
            </P>
            <Stack gap={2}>
                <Text as="p" weight="semibold">
                    Parameters
                </Text>
                <Ul>
                    <Li>id: required literal query name.</Li>
                    <Li>
                        path: required request path, resolved relative to the current application base URL and evaluated
                        against the XML runtime scope.
                    </Li>
                    <Li>Query is setup-only, does not render, and cannot have children.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Query id="orders" path="/api/orders" />

<For each="$orders.items" as="order">
  <Text i18n="orders.row" values="\${{ number: order.number, status: order.status }}" />
</For>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="action" level={2}>
                Action
            </Heading>
            <P>Provides request behavior to a child Button and sends the mutation when that button is activated.</P>
            <Stack gap={2}>
                <Text as="p" weight="semibold">
                    Parameters
                </Text>
                <Ul>
                    <Li>action: optional application-relative request path.</Li>
                    <Li>method: optional HTTP method. Defaults to POST.</Li>
                    <Li>json: optional expression payload sent as JSON.</Li>
                    <Li>form: optional expression object sent as multipart form data instead of JSON.</Li>
                    <Li>invalidate: optional expression resolving to setup ids to refresh.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Action action="/api/orders/\${order.id}/complete" invalidate="\${['orders']}">
  <Button i18n="orders.complete" />
</Action>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="for" level={2}>
                For
            </Heading>
            <P>
                Repeats child XML for each item in an array. Every iteration gets a child scope with the item alias and
                an index value.
            </P>
            <Stack gap={2}>
                <Text as="p" weight="semibold">
                    Parameters
                </Text>
                <Ul>
                    <Li>each: required expression that must resolve to an array.</Li>
                    <Li>as: required local variable name for each item.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<For each="$orders.items" as="order">
  <Card>
    <Heading level="3" i18n="orders.cardTitle" values="\${{ index: index + 1, number: order.number }}" />
    <Badge i18n="orders.status" values="\${{ status: order.status }}" />
  </Card>
</For>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="if" level={2}>
                if
            </Heading>
            <P>
                Global conditional prop supported by rendered XML nodes. When the expression is falsy, the node and its
                children are skipped.
            </P>
            <Stack gap={2}>
                <Text as="p" weight="semibold">
                    Parameters
                </Text>
                <Ul>
                    <Li>if: expression evaluated in the current XML runtime scope.</Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Badge if="$order.blocked" variant="error" i18n="orders.blocked" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="i18n" level={2}>
                i18n
            </Heading>
            <P>
                Global translation prop used by text-bearing elements. The value is a literal dotted key that exactly
                matches a flat entry in the active locale catalog, not an expression.
            </P>
            <Stack gap={2}>
                <Text as="p" weight="semibold">
                    Parameters
                </Text>
                <Ul>
                    <Li>i18n: dotted translation key.</Li>
                    <Li>count: optional expression supplied to an ICU plural message.</Li>
                    <Li>
                        values: optional expression resolving to one object that fills <Code>{'{name}'}</Code>{' '}
                        placeholders.
                    </Li>
                </Ul>
            </Stack>
            <CodeBlock language="xml">{`<Heading level="1" i18n="orders.title" />
<Text i18n="orders.count" count="\${orders.items.length}" />
<Button i18n="orders.assign" values="\${{ user: assignee.name }}" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="expressions" level={2}>
                Expressions
            </Heading>
            <P>
                Expressions have a dedicated reference covering <Code>$</Code> bindings, <Code>{'${...}'}</Code> typed
                values, interpolation, supported operators, safe calls, and XML escaping.
            </P>
            <P>
                Read the{' '}
                <Link href="/docs/sdk/pages/expressions" type="inherit" hasUnderline>
                    expressions reference
                </Link>{' '}
                before writing complex conditions or action payloads.
            </P>
            <CodeBlock language="xml">{`<TextInput label="Order name" value="$form.name" />
<Text i18n="orders.summary" values="\${{ name: form.name }}" count="\${orders.items.length}" />
<Button isDisabled="\${form.saving || !form.name}" i18n="actions.save" />`}</CodeBlock>
        </Stack>
    </Stack>
);
