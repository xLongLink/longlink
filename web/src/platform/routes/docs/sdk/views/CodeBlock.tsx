import ViewLayout from './ViewLayout';

/** Documents CodeBlock in LongLink Views. */
export default function CodeBlockPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="CodeBlock"
            examples={[
                {
                    title: 'CodeBlock',
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
