import ViewLayout from './ViewLayout';
import { ComponentPreview } from './Preview';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { Heading } from '@astryxdesign/core/Heading';
import { CodeBlock } from '@astryxdesign/core/CodeBlock';
import { Table, proportional } from '@astryxdesign/core/Table';

// Document only the React bindings exposed by the isolated View runtime.
const functions = [
    {
        name: 'useState(initial)',
        description:
            'Returns the current state and a setter. Pass a value or an initializer function; updates can use the previous state.',
    },
    {
        name: 'useEffect(effect, dependencies)',
        description:
            'Synchronizes with external systems after rendering. Return a cleanup function to release timers or subscriptions. Include every reactive value used by the effect in its dependencies.',
    },
    {
        name: 'useMemo(factory, dependencies)',
        description:
            'Caches a calculated value until its dependencies change. Use it for expensive calculations, not required application state.',
    },
    {
        name: 'useRef(initial)',
        description:
            'Returns a stable object with a mutable current property. Changing current does not trigger a render.',
    },
];

/** Documents the React bindings and a stateful View example. */
export default function ReactPage() {
    // Render the runtime-specific functions table and stateful counter example.
    return (
        <ViewLayout
            name="React"
            reference={{
                introduction:
                    'LongLink supplies these React functions directly in Views, without imports or a React. prefix. Call hooks at the top level of a component, never inside conditions or loops.',
                properties: [],
                practices: [],
            }}
            toc={[
                { id: 'functions', label: 'Functions', level: 2 },
                { id: 'example', label: 'Example usage', level: 2 },
            ]}
        >
            <Heading id="functions" level={2}>
                Functions
            </Heading>
            <Table
                data={functions}
                idKey="name"
                density="compact"
                columns={[
                    { key: 'name', header: 'Function', width: proportional(2) },
                    { key: 'description', header: 'Usage', width: proportional(3) },
                ]}
            />
            <Text as="p">
                Fragment groups children without adding a DOM wrapper. Use the JSX shorthand &lt;&gt;…&lt;/&gt; or
                &lt;Fragment key=&#123;id&#125;&gt;…&lt;/Fragment&gt; when a key is needed.
            </Text>
            <Heading id="example" level={2}>
                Example usage
            </Heading>
            <Text as="p">
                This View stores a counter in local state. The setter receives the previous value so each click
                increments it safely.
            </Text>
            <Stack padding={4} className="rounded-lg border border-border" aria-label="Counter preview">
                <ComponentPreview name="React" />
            </Stack>
            <CodeBlock
                code={`function Example() {
  const [count, setCount] = useState(0);

  return (
    <Stack gap={3}>
      <Text>Count: {count}</Text>
      <Button
        label="Increment"
        onClick={() => setCount((previous) => previous + 1)}
      />
    </Stack>
  );
}`}
                language="jsx"
                title="counter.jsx"
                hasLanguageLabel={false}
            />
        </ViewLayout>
    );
}
