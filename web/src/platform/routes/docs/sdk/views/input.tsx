import { Input } from '@/components/longlink';
import FormDocumentation from './form-documentation';

/** Shows a native text input with control-owned labeling and feedback. */
export function InputExample() {
    return <Input name="name" label="Name" description="The order name." defaultValue="New order" required />;
}

/** Documents native input behavior and schema-backed forms. */
export default function InputPage() {
    return (
        <FormDocumentation
            name="Input"
            preview={<InputExample />}
            code={`const schema = z.object({ name: z.string().trim().min(1, "Enter an order name.") });

function Example() {
  const submit = useSubmit("/api/orders");
  const form = useForm({
    defaultValues: { name: "New order" },
    resolver: zodResolver(schema),
  });

  async function save(values) {
    const data = new FormData();
    data.set("name", values.name);

    try {
      await submit(data);
    } catch (error) {
      form.setError("root", { message: error.message });
    }
  }

  return (
    <form onSubmit={form.handleSubmit(save)} noValidate>
      <Stack gap={4}>
        <Input
          {...form.register("name")}
          label="Name"
          description="The order name."
          error={form.formState.errors.name?.message}
          disabled={form.formState.isSubmitting}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
        {form.formState.errors.root?.message && <p role="alert">{form.formState.errors.root.message}</p>}
      </Stack>
    </form>
  );
}`}
        />
    );
}
