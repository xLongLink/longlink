import { CodeBlock } from '@/components/CodeBlock';
import { Code } from '@/components/ui/code';
import { Heading } from '@/components/ui/heading';
import { Li } from '@/components/ui/li';
import { P } from '@/components/ui/p';
import { Stack } from '@/components/ui/stack';
import { Ul } from '@/components/ui/ul';

export const metadata = {
    lastUpdated: '2026-07-09',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/expressions.tsx',
};

export const content = (
    <Stack>
        <Heading id="expressions" level="h2">
            Expressions
        </Heading>
        <P>
            XML page expressions use a safe JavaScript expression subset parsed with Acorn. LongLink evaluates only
            approved syntax against the XML runtime scope; it does not execute arbitrary JavaScript.
        </P>
        <Stack className="gap-3">
            <Heading id="syntax-forms" level="h2">
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
            <CodeBlock language="xml">{`<Input value="$draft.title" />
<P count="\${tasks.length}" i18n="tasks.count" />
<A to="/requests/\${params.request}" i18n="requests.open" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="runtime-scope" level="h2">
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
  <P i18n="tasks.row" index="\${index + 1}" title="$task.title" />
</For>`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="operators" level="h2">
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
            <CodeBlock language="xml">{`<Button disabled="\${!draft.title || saving}" i18n="tasks.create" />
<P if="\${task.status === 'open'}" i18n="tasks.title" title="$task.title" />
<Badge value="\${task.priority >= 5 ? 'High' : 'Normal'}" />
<P i18n="tasks.owner" name="\${task.owner?.name ?? 'Unassigned'}" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="arrays-objects-and-templates" level="h2">
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

<P i18n="tasks.summary" summary="\${` +
                    '`Task ${task.id}: ${task.title}`' +
                    `}" />`}
            </CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="safe-calls" level="h2">
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
            <CodeBlock language="xml">{`<P i18n="tasks.id" id="\${String(task.id)}" />
<P if="\${Array.isArray(tasks) &amp;&amp; tasks.length > 0}" i18n="tasks.ready" />
<P i18n="tasks.total" total="\${Math.round(total)}" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="bindings" level="h2">
                Bindings
            </Heading>
            <P>
                Writable form bindings use the <Code>$</Code> reference form. A typed expression can read a state field,
                but it does not create a writable control binding.
            </P>
            <CodeBlock language="xml">{`<State id="draft" title="" />

<!-- writable -->
<Input value="$draft.title" />

<!-- read-only expression result -->
<P i18n="tasks.draftTitle" title="\${draft.title || 'Untitled'}" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="xml-escaping" level="h2">
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
            <CodeBlock language="xml">{`<P if="\${amount &lt; 100}" i18n="orders.small" />
<P if="\${ready &amp;&amp; tasks.length > 0}" i18n="tasks.ready" />`}</CodeBlock>
        </Stack>
        <Stack className="gap-3">
            <Heading id="unsupported-syntax" level="h2">
                Unsupported Syntax
            </Heading>
            <P>Expressions are intentionally read-only and sandboxed.</P>
            <Ul>
                <Li>Arbitrary function calls and object method calls are blocked.</Li>
                <Li>Assignments, updates, constructors, classes, imports, and dynamic code execution are blocked.</Li>
                <Li>Inherited properties and unsafe prototype names are not readable.</Li>
            </Ul>
            <CodeBlock language="xml">{`<!-- blocked -->
<P i18n="tasks.title" title="\${task.title.toUpperCase()}" />
<P i18n="tasks.created" created="\${new Date()}" />
<P i18n="tasks.unsafe" unsafe="\${task.__proto__}" />`}</CodeBlock>
        </Stack>
    </Stack>
);
