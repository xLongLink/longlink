import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents schema validation, editing defaults, and scoped multipart form submission. */
export default function UseFormPage() {
    return (
        <ViewLayout
            name="useForm"
            properties={[
                { name: 'schema', type: 'ZodType<Output, Input>' },
                {
                    name: 'options',
                    type: 'Omit<UseFormProps<Input, Context, Output>, "resolver"> & SubmitOptions & { action?: string }'
                },
                { name: 'options.action', type: 'string' },
                { name: 'options.method', type: '"POST" | "PUT" | "PATCH" | "DELETE"' },
                { name: 'options.onSuccess', type: '(data: ViewData) => void | Promise<void>' },
                { name: 'options.onError', type: '(error: Error) => void | Promise<void>' },
                { name: 'submit', type: '(event?: BaseSyntheticEvent) => Promise<void>' },
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
            <CodeBlock
                language="jsx"
                code={`export default function ItemForm() {
  const form = useForm(z.object({ name: z.string().trim().min(1, 'Enter a name') }), {
    defaultValues: { name: '' },
    action: '/api/items',
  });

  return (
    <form onSubmit={form.submit} noValidate>
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Input {...field} label="Item name" error={fieldState.error?.message} />
        )}
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
        </ViewLayout>
    );
}
