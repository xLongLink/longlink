import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents schema-owned validation with caller-owned editing defaults. */
export default function UseFormPage() {
    return (
        <ViewLayout
            name="useForm"
            properties={[
                { name: 'schema', type: 'ZodType<Output, Input>' },
                { name: 'options', type: 'Omit<UseFormProps<Input, Context, Output>, "resolver">' },
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
  });
  const submit = useSubmit('/api/items', {
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
