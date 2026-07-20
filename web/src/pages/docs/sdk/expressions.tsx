import type { ReactNode } from 'react';
import { Code } from '@astryxdesign/core/Code';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { List, ListItem } from '@astryxdesign/core/List';
import { CodeBlock } from '@/components/CodeBlock';

/** Renders paragraph text in the expressions reference. */
function P({ children }: { children: ReactNode }) {
    return <Text as="p">{children}</Text>;
}

/** Renders a bulleted list in the expressions reference. */
function Ul({ children }: { children: ReactNode }) {
    return <List listStyle="disc">{children}</List>;
}

/** Renders one bulleted item in the expressions reference. */
function Li({ children }: { children: ReactNode }) {
    return <ListItem label={<Text>{children}</Text>} />;
}

export const metadata = {
    lastUpdated: '2026-07-20',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/expressions.tsx',
};

export const content = (
    <Stack gap={4}>
        <Heading id="expressions" level={1}>
            Expressions
        </Heading>
        <P>
            XML page expressions use a safe JavaScript expression subset parsed with Acorn. LongLink evaluates only
            approved syntax against the XML runtime scope; it does not execute arbitrary JavaScript.
        </P>
        <Stack gap={3}>
            <Heading id="syntax-forms" level={2}>
                Syntax Forms
            </Heading>
            <Ul>
                <Li>
                    <Code>$draft.title</Code> reads a runtime value and creates a writable binding for controls that
                    support bindings.
                </Li>
                <Li>
                    <Code>{'${draft.title}'}</Code> evaluates a typed expression and returns the expression result.
                </Li>
                <Li>
                    <Code>{'/requests/${params.request}'}</Code> interpolates expression results inside a string
                    parameter.
                </Li>
                <Li>
                    Plain text stays literal unless it is a dotted runtime path, a <Code>$</Code> reference, or contains
                    <Code>{'${...}'}</Code> interpolation.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<TextInput label="Task title" value="$draft.title" />
<Text count="\${tasks.length}" i18n="tasks.count" />
<Link to="/requests/\${params.request}" i18n="requests.open" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="runtime-scope" level={2}>
                Runtime Scope
            </Heading>
            <P>Expressions can read values exposed by setup nodes, route params, and loop scopes.</P>
            <Ul>
                <Li>
                    <Code>State</Code> values are reactive local page objects, such as <Code>draft.title</Code>.
                </Li>
                <Li>
                    <Code>Query</Code> values are JSON responses stored under their query id, such as{' '}
                    <Code>tasks.length</Code>.
                </Li>
                <Li>
                    <Code>For</Code> exposes the item alias and <Code>index</Code> inside the loop body.
                </Li>
                <Li>
                    Dynamic page files expose route parameters through <Code>params</Code>.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Query id="tasks" path="/api/tasks" />
<For each="$tasks" as="task">
  <Text i18n="tasks.row" values="\${{ index: index + 1, title: task.title }}" />
</For>`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="operators" level={2}>
                Operators
            </Heading>
            <P>Supported operators cover page conditions, derived values, and request payloads.</P>
            <Ul>
                <Li>
                    Arithmetic: <Code>+</Code>, <Code>-</Code>, <Code>*</Code>, <Code>/</Code>, <Code>%</Code>, and{' '}
                    <Code>**</Code>.
                </Li>
                <Li>
                    Equality and comparison: <Code>===</Code>, <Code>!==</Code>, <Code>==</Code>, <Code>!=</Code>,{' '}
                    <Code>&lt;</Code>, <Code>&lt;=</Code>, <Code>&gt;</Code>, and <Code>&gt;=</Code>.
                </Li>
                <Li>
                    Logical expressions: <Code>&amp;&amp;</Code>, <Code>||</Code>, <Code>??</Code>, and <Code>!</Code>.
                </Li>
                <Li>
                    Membership: <Code>status in [&apos;open&apos;, &apos;pending&apos;]</Code> checks strings, arrays,
                    and object keys.
                </Li>
                <Li>
                    Conditional values: <Code>condition ? yes : no</Code>.
                </Li>
                <Li>
                    Optional chaining: <Code>user?.profile?.name</Code>.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Button isDisabled="\${!draft.title || saving}" i18n="tasks.create" />
<Text if="\${task.status === 'open'}" i18n="tasks.title" values="\${{ title: task.title }}" />
<Badge label="\${task.priority >= 5 ? 'High' : 'Normal'}" />
<Text i18n="tasks.owner" values="\${{ name: task.owner?.name ?? 'Unassigned' }}" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="arrays-objects-and-templates" level={2}>
                Arrays, Objects, and Templates
            </Heading>
            <P>Wrapped expressions preserve typed values, so arrays and objects can be sent directly to actions.</P>
            <CodeBlock language="xml">
                {`<Action
  action="/api/tasks"
  invalidate="\${['tasks']}"
  json="\${{ title: draft.title, priority: Number(draft.priority) }}"
>
  <Button i18n="tasks.create" />
</Action>

<Text i18n="tasks.summary" values="\${{ summary: ` +
                    '`Task ${task.id}: ${task.title}`' +
                    ` }}" />`}
            </CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="safe-calls" level={2}>
                Safe Calls
            </Heading>
            <P>Only whitelisted global helpers can be called from expressions.</P>
            <Ul>
                <Li>
                    Type helpers: <Code>String(value)</Code>, <Code>Number(value)</Code>, and{' '}
                    <Code>Boolean(value)</Code>.
                </Li>
                <Li>
                    Array helper: <Code>Array.isArray(value)</Code>.
                </Li>
                <Li>
                    Math helpers: <Code>Math.abs</Code>, <Code>Math.ceil</Code>, <Code>Math.floor</Code>,{' '}
                    <Code>Math.max</Code>, <Code>Math.min</Code>, <Code>Math.round</Code>, and <Code>Math.trunc</Code>.
                </Li>
            </Ul>
            <CodeBlock language="xml">{`<Text i18n="tasks.id" values="\${{ id: String(task.id) }}" />
<Text if="\${Array.isArray(tasks) &amp;&amp; tasks.length > 0}" i18n="tasks.ready" />
<Text i18n="tasks.total" values="\${{ total: Math.round(total) }}" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="bindings" level={2}>
                Bindings
            </Heading>
            <P>
                Writable form bindings use the <Code>$</Code> reference form. A typed expression can read a state field,
                but it does not create a writable control binding.
            </P>
            <CodeBlock language="xml">{`<State id="draft" title="" />

<!-- writable -->
<TextInput label="Task title" value="$draft.title" />

<!-- read-only expression result -->
<Text i18n="tasks.draftTitle" values="\${{ title: draft.title || 'Untitled' }}" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="xml-escaping" level={2}>
                XML Escaping
            </Heading>
            <P>
                XML attributes must still be valid XML. Escape reserved characters before the expression reaches the
                LongLink evaluator.
            </P>
            <Ul>
                <Li>
                    Use <Code>&amp;lt;</Code> for less-than comparisons.
                </Li>
                <Li>
                    Use <Code>&amp;amp;&amp;amp;</Code> for logical and.
                </Li>
                <Li>Quote XML attributes with single quotes when the expression contains many double quotes.</Li>
            </Ul>
            <CodeBlock language="xml">{`<Text if="\${amount &lt; 100}" i18n="orders.small" />
<Text if="\${ready &amp;&amp; tasks.length > 0}" i18n="tasks.ready" />`}</CodeBlock>
        </Stack>
        <Stack gap={3}>
            <Heading id="unsupported-syntax" level={2}>
                Unsupported Syntax
            </Heading>
            <P>Expressions are intentionally read-only and sandboxed.</P>
            <Ul>
                <Li>Arbitrary function calls and object method calls are blocked.</Li>
                <Li>Assignments, updates, constructors, classes, imports, and dynamic code execution are blocked.</Li>
                <Li>Inherited properties and unsafe prototype names are not readable.</Li>
            </Ul>
            <CodeBlock language="xml">{`<!-- blocked -->
<Text i18n="tasks.title" values="\${{ title: task.title.toUpperCase() }}" />
<Text i18n="tasks.created" values="\${{ created: new Date() }}" />
<Text i18n="tasks.unsafe" values="\${{ unsafe: task.__proto__ }}" />`}</CodeBlock>
        </Stack>
    </Stack>
);
