import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents scoped Solution queries and explicit refresh. */
export default function UseApiPage() {
    return (
        <ViewLayout
            name="useApi"
            properties={[
                { name: 'path', type: 'string' },
                { name: 'data', type: 'ViewData' },
                { name: 'invalidate', type: '() => Promise<void>' }
            ]}
        >
            <CodeBlock
                language="jsx"
                code={`export default function Items() {
  const [items, invalidate] = useApi('/api/items?status=open');

  return (
    <Stack gap={3}>
      <Button onClick={async () => { await invalidate(); }}>Refresh</Button>
      {items.map((item) => <Text key={item.id}>{item.name}</Text>)}
    </Stack>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
