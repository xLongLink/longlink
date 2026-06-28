import { Link } from 'react-router';

import { CodeBlock } from '@/components/CodeBlock';
import { Heading } from '@/components/ui/heading';

type ConceptDoc = {
    name: string;
    id: string;
    description: string;
    parameters: string[];
    example: string;
};

const conceptDocs: ConceptDoc[] = [
    {
        name: 'longlink',
        id: 'longlink',
        description:
            'Root XML page element. It accepts no attributes, renders its children in the runtime shell, and should wrap the page body returned by an SDK page handler.',
        parameters: ['No parameters. Attributes are rejected so page roots stay predictable.'],
        example: `<longlink>
  <H1 i18n="orders.title" />
  <P i18n="orders.description" />
</longlink>`,
    },
    {
        name: 'State',
        id: 'state',
        description:
            'Declares local reactive page state before rendering. Descendant controls can read and write the state through XML value bindings.',
        parameters: [
            'id: required literal state name.',
            'Any additional attribute becomes an initial state field. JSON values are parsed when possible, otherwise the value is evaluated.',
            'State is setup-only, does not render, and cannot have children.',
        ],
        example: `<State id="form" name="" active="true" />

<Field>
  <FieldLabel htmlFor="name" i18n="customers.name" />
  <FieldContent>
    <Input id="name" value="$form.name" />
  </FieldContent>
</Field>`,
    },
    {
        name: 'Query',
        id: 'query',
        description:
            'Fetches JSON data for the page before rendering. The response is stored in the runtime context and can be used by expressions, loops, and bindings.',
        parameters: [
            'id: required literal query name.',
            'path: required literal request path, resolved relative to the current app base URL.',
            'Query is setup-only, does not render, and cannot have children.',
        ],
        example: `<Query id="orders" path="/api/orders" />

<For each="orders.items" as="order">
  <P i18n="orders.row" number="order.number" status="order.status" />
</For>`,
    },
    {
        name: 'For',
        id: 'for',
        description:
            'Repeats child XML for each item in an array. Every iteration gets a child scope with the item alias and an index value.',
        parameters: [
            'each: required expression that must resolve to an array.',
            'as: required local variable name for each item.',
            'if: optional global condition for rendering the loop.',
        ],
        example: `<For each="orders.items" as="order">
  <Card>
    <H3 i18n="orders.cardTitle" index="index + 1" number="order.number" />
    <Badge i18n="orders.status" status="order.status" />
  </Card>
</For>`,
    },
    {
        name: 'if',
        id: 'if',
        description:
            'Global conditional prop supported by rendered XML nodes. When the expression is falsy, the node and its children are skipped.',
        parameters: ['if: expression evaluated in the current XML runtime scope.'],
        example: `<Badge if="order.blocked" variant="destructive" i18n="orders.blocked" />`,
    },
    {
        name: 'i18n',
        id: 'i18n',
        description:
            'Global translation prop used by text-bearing elements. The value is a literal dotted key into the active locale bundle, not an expression.',
        parameters: [
            'i18n: literal translation key.',
            'count: optional expression used for plural translation entries.',
            'Any additional attribute can fill {{name}} placeholders inside the translation string.',
        ],
        example: `<H1 i18n="orders.title" />
<P i18n="orders.count" count="orders.items.length" />
<Button i18n="orders.assign" user="assignee.name" />`,
    },
    {
        name: 'Expressions',
        id: 'expressions',
        description:
            'Most XML parameters are expression-aware. Use plain dotted paths, explicit $ bindings, or ${...} interpolation when mixing text and values.',
        parameters: [
            'path.to.value reads from the runtime context.',
            '$state.field creates a writable binding for controls that support it.',
            '${...} interpolates expression output inside a string parameter or text node.',
        ],
        example: `<Input value="$form.name" />
<P i18n="orders.summary" name="form.name" count="orders.items.length" />
<Button disabled="form.saving" i18n="actions.save" />`,
    },
    {
        name: 'Invalidation',
        id: 'invalidation',
        description:
            'Actions can refresh setup values after a mutation. Use invalidate with a list of State or Query ids that should be recreated or refetched.',
        parameters: [
            'action: request path or URL for the mutation.',
            'method: HTTP method, default POST.',
            'json: expression payload sent as JSON.',
            'invalidate: expression that resolves to an array of setup ids.',
        ],
        example: `<Action
  action="/api/orders/${'${order.id}'}/complete"
  method="POST"
  invalidate="['orders']"
>
  <P i18n="orders.complete" />
</Action>`,
    },
];

/** Renders one generic XML page concept. */
function ConceptSection({ concept }: { concept: ConceptDoc }) {
    return (
        <section className="space-y-3">
            <Heading id={concept.id} level="h2">
                {concept.name}
            </Heading>
            <p className="leading-7">{concept.description}</p>
            <div>
                <p className="font-medium text-foreground">Parameters</p>
                <ul className="ml-6 list-disc space-y-2">
                    {concept.parameters.map((parameter) => (
                        <li key={parameter}>{parameter}</li>
                    ))}
                </ul>
            </div>
            <CodeBlock language="xml">{concept.example}</CodeBlock>
        </section>
    );
}

/** Renders the SDK Pages documentation overview and XML runtime concepts. */
function PagesContent() {
    return (
        <div className="flex flex-col gap-4">
            <Heading id="pages" level="h1">
                Pages
            </Heading>
            <p className="leading-7">
                Pages define the XML UI returned by SDK page handlers. The root page covers the runtime concepts shared
                by every element: state, queries, loops, conditions, translations, expressions, bindings, and
                invalidation.
            </p>
            <p className="leading-7">
                Element references live in the SDK pages section:{' '}
                <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/layout">
                    layout elements
                </Link>{' '}
                and{' '}
                <Link className="text-foreground underline underline-offset-4" to="/docs/sdk/pages/components">
                    component elements
                </Link>
                .
            </p>
            {conceptDocs.map((concept) => (
                <ConceptSection key={concept.id} concept={concept} />
            ))}
        </div>
    );
}

export const metadata = {
    lastUpdated: '2026-06-28',
    editUrl: 'https://github.com/xLongLink/longlink/edit/main/web/src/pages/docs/sdk/pages.tsx',
};

export const content = <PagesContent />;
