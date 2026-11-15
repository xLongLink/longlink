import { Input } from '@/views/adapter/form/input';
import FormDocumentation from './form-documentation';

/** Shows a native text input with control-owned labeling and feedback. */
export function InputExample() {
    return <Input name="name" label="Name" description="The order name." defaultValue="New order" required />;
}

/** Documents native input behavior and optional schema validation. */
export default function InputPage() {
    return (
        <FormDocumentation
            name="Input"
            preview={<InputExample />}
            code={`function Example() {
  const form = useForm({
    resolver: zodResolver(z.object({ name: z.string().trim().min(1, "Enter an order name.") })),
    defaultValues: { name: "New order" },
  });
  const submit = useSubmit("/api/orders", {
    onError: () => form.setError("root", { message: "Could not save. Please try again." }),
  });

  async function save(values) {
    const data = new FormData();
    data.append("name", values.name);
    await submit(data);
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
