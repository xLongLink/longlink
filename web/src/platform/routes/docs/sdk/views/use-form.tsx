import ViewLayout from './view-layout';
import { CodeBlock, CodeBlockCopyButton } from '@/components/reui/code-block/code-block';

/** Documents schema validation and native form submission. */
export default function UseFormPage() {
    return (
        <ViewLayout
            name="useForm"
            properties={[
                { name: 'options', type: 'UseFormProps<Input, Context, Output>' },
                { name: 'options.defaultValues', type: 'DefaultValues<Input>' },
                { name: 'options.resolver', type: 'Resolver<Input, Context, Output>' },
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
                useForm is React Hook Form. Use zodResolver for validation and handleSubmit to pass parsed values to
                your save callback. Encode those values as FormData for useSubmit; append files directly rather than
                converting them to strings.
            </p>
            <CodeBlock
                language="jsx"
                code={`const schema = z.object({ name: z.string().trim().min(1, 'Enter a name') });

export default function ItemForm() {
  const submit = useSubmit('/api/items');
  const form = useForm({
    defaultValues: { name: '' },
    resolver: zodResolver(schema),
  });

  async function save(values) {
    const data = new FormData();
    data.set('name', values.name);

    try {
      await submit(data);
    } catch (error) {
      form.setError('root', { message: error.message });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(save)} noValidate>
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
        </ViewLayout>
    );
}
