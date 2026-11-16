import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents standalone writes; forms submit through useForm. */
export default function UseSubmitPage() {
    return (
        <ViewLayout
            name="useSubmit"
            properties={[
                { name: 'path', type: 'string' },
                { name: 'action', type: '(data: T) => void | Promise<void>' },
                { name: 'options.method', type: '"POST" | "PUT" | "PATCH" | "DELETE"' },
                { name: 'options.onSuccess', type: '(data: ViewData) => void | Promise<void>' },
                { name: 'options.onError', type: '(error: Error) => void | Promise<void>' },
                { name: 'return', type: '((data: FormData) => Promise<void>) | ((data: T) => Promise<void>)' }
            ]}
        >
            <CodeBlock
                language="jsx"
                code={`export default function RetryItem({ params }) {
  const submit = useSubmit(\`/api/items/\${params.item}/retry\`);

  return (
    <Button onClick={async () => { await submit(new FormData()); }}>
      Retry
    </Button>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
