import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents scoped multipart writes. */
export default function UseSubmitPage() {
    return (
        <ViewLayout
            name="useSubmit"
            properties={[
                { name: 'path', type: 'string' },
                { name: 'options.method', type: '"POST" | "PUT" | "PATCH" | "DELETE"' },
                { name: 'options.onSuccess', type: '(data: ViewData) => void | Promise<void>' },
                { name: 'options.onError', type: '(error: Error) => void | Promise<void>' },
                { name: 'return', type: '(data: FormData) => Promise<void>' }
            ]}
        >
            <p>
                useSubmit sends FormData to a Solution endpoint. For validated forms, call it from the save callback
                passed to form.handleSubmit.
            </p>
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
