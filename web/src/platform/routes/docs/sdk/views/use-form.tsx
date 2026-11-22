import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents schema validation and native form submission. */
export default function UseFormPage() {
    return (
        <ViewLayout
            name="useForm"
            properties={[
                { name: 'path', type: 'string' },
                { name: 'options.schema', type: 'Zod schema' },
                { name: 'options.defaultValues', type: 'DefaultValues<Input>' },
                { name: 'options.method', type: '"POST" | "PUT" | "PATCH" | "DELETE" (default "POST")' },
                { name: 'options.onSuccess', type: '(data: ViewData) => void | Promise<void>' },
                { name: 'options.onError', type: '(error: Error) => void | Promise<void>' },
                { name: 'onSubmit', type: 'FormEventHandler<HTMLFormElement>' },
                { name: 'submit', type: '(data?: Input | FormData) => Promise<void>' },
                { name: 'register', type: 'UseFormRegister<Input>' },
                { name: 'control', type: 'Control<Input, Context, Output>' },
                { name: 'formState', type: 'FormState<Input>' },
                { name: 'handleSubmit', type: 'UseFormHandleSubmit<Input, Output>' },
                { name: 'reset', type: 'UseFormReset<Input>' },
                { name: 'setError', type: 'UseFormSetError<Input>' },
                { name: 'setValue', type: 'UseFormSetValue<Input>' },
                { name: 'getValues', type: 'UseFormGetValues<Input>' },
                { name: 'watch', type: 'UseFormWatch<Input>' }
            ]}
        >
            <p>
                useForm combines React Hook Form with a scoped Solution write. Pass a schema to validate and submit
                parsed values, and bind form.onSubmit to a native form. Define validation in the schema rather than
                register rules. register, control, handleSubmit, and the other React Hook Form APIs remain available.
                Read pending state from formState.isSubmitting, field validation from formState.errors, and submission
                failures from formState.errors.root.
            </p>
            <CodeBlock
                language="jsx"
                code={`const schema = z.object({ name: z.string().trim().min(1, 'Enter a name') });

export default function ItemForm() {
  const form = useForm('/api/items', {
    schema,
    defaultValues: { name: '' },
  });

  return (
    <form onSubmit={form.onSubmit} noValidate>
      <Input
        {...form.register('name')}
        label="Item name"
        error={form.formState.errors.name?.message}
      />
      {form.formState.errors.root && (
        <Text role="alert">{form.formState.errors.root.message}</Text>
      )}
      <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
    </form>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
            <p>
                For actions without a form, await form.submit(values) or form.submit(formData). Calling form.submit()
                submits the current values, or an empty payload when no fields are configured. Successful writes refresh
                View data before onSuccess. Draft values remain until reset. Invalid values reject submission and
                populate field errors. Submission failures reject unless onError handles them; omit onError when a
                confirmation must stay open on failure.
            </p>
            <CodeBlock
                language="jsx"
                code={`export default function RetryItem({ params }) {
  const form = useForm(\`/api/items/\${params.item}/retry\`);

  return (
    <Stack gap={2}>
      <Button onClick={async () => { await form.submit(); }} disabled={form.formState.isSubmitting}>
        Retry
      </Button>
      {form.formState.errors.root?.message && (
        <Text role="alert">{form.formState.errors.root.message}</Text>
      )}
    </Stack>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
            <CodeBlock
                language="jsx"
                code={`export default function PublishItem({ file }) {
  const form = useForm('/api/items');

  return (
    <Button
      disabled={form.formState.isSubmitting}
      onClick={async () => {
        await form.submit({
          name: 'Report',
          count: 2,
          published: true,
          attachment: file,
          tags: ['a', 'b'],
        });
      }}
    >
      Publish
    </Button>
  );
}`}
            >
                <CodeBlockCopyButton />
            </CodeBlock>
            <p>
                Values are encoded as multipart FormData: strings are preserved, numbers and booleans become strings,
                and File and Blob values remain binary. Arrays produce repeated entries under the same field name; null
                and undefined are omitted. Nested objects are not supported. Pass FormData directly when you need
                explicit multipart entries. With a schema, FormData fields become scalars for a single entry and arrays
                for repeated entries; submit an object to preserve single-item arrays.
            </p>
        </ViewLayout>
    );
}
