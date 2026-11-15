import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents React Hook Form state in Views. */
export default function UseFormPage() {
    return (
        <ViewLayout
            name="useForm"
            properties={[
                { name: 'options', type: 'UseFormProps<TFieldValues>' },
                { name: 'control', type: 'Control<TFieldValues>' },
                { name: 'formState', type: 'FormState<TFieldValues>' },
                { name: 'handleSubmit', type: 'UseFormHandleSubmit<TFieldValues>' },
                { name: 'reset', type: 'UseFormReset<TFieldValues>' },
                { name: 'setError', type: 'UseFormSetError<TFieldValues>' },
                { name: 'setValue', type: 'UseFormSetValue<TFieldValues>' },
                { name: 'getValues', type: 'UseFormGetValues<TFieldValues>' },
                { name: 'watch', type: 'UseFormWatch<TFieldValues>' }
            ]}
        >
            <CodeBlock
                language="jsx"
                code={`export default function ItemForm() {
  const form = useForm({ defaultValues: { name: '' } });
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
        rules={{ required: 'Enter a name' }}
        render={({ field, fieldState }) => (
          <Stack gap={2}>
            <Input {...field} aria-label="Item name" aria-invalid={fieldState.invalid} />
            {fieldState.error && <Text role="alert">{fieldState.error.message}</Text>}
          </Stack>
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
