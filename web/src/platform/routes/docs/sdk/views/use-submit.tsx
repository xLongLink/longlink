import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents awaitable, duplicate-protected writes. */
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
                code={`export default function RenameItem({ params }) {
  const form = useForm({ defaultValues: { name: '' } });
  const submit = useSubmit(\`/api/items/\${params.item}\`, {
    method: 'PATCH',
    onSuccess: () => form.reset(),
    onError: (error) => form.setError('root', { message: error.message })
  });

  return (
    <form onSubmit={form.handleSubmit(async (values) => {
      const data = new FormData();
      data.set('name', values.name);
      await submit(data);
    })}>
      <Controller
        name="name"
        control={form.control}
        render={({ field }) => <Input {...field} aria-label="Item name" />}
      />
      {form.formState.errors.root && (
        <Text role="alert">{form.formState.errors.root.message}</Text>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>Rename</Button>
    </form>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
        </ViewLayout>
    );
}
