import ViewLayout from './ViewLayout';
import { CodeBlock } from '@/components/ui/CodeBlock';

/** Documents CodeBlock in LongLink Views. */
export default function CodeBlockPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="CodeBlock"
            examples={[
                {
                    title: 'CodeBlock',
                    preview: <CodeBlockExample />,
                    code: `function Example() {
  return (
    <CodeBlock
      code={'function Example() { return <Text>Hello</Text>; }'}
      language="jsx"
      title="example.jsx"
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Renders the page's code example for documentation and the catalog. */
export function CodeBlockExample() {
    // Display a copyable sample without evaluating its source.
    return <CodeBlock code={'function Example() {\n  return <Text>Hello world</Text>;\n}'} language="jsx" isWrapped />;
}
