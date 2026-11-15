import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';
import { Field, FieldDescription, FieldLabel } from '@/components/shadcn/field';

/** Documents native input and field composition. */
export default function InputPage() {
    return (
        <ViewLayout
            name="Input"
            properties={[
                { name: 'name', type: 'string', description: 'Native FormData field name.' },
                { name: 'type', type: 'HTMLInputTypeAttribute', description: 'Native input type.' },
                { name: 'defaultValue', type: 'string | number', description: 'Initial uncontrolled value.' },
                { name: 'value', type: 'string | number', description: 'Controlled input value.' },
                { name: 'onChange', type: 'ChangeEventHandler<HTMLInputElement>', description: 'Native change event.' },
                {
                    name: 'min / max / step',
                    type: 'string | number',
                    description: 'Native bounds and step validation for type="number". Use step="any" for decimals.'
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables interaction and excludes the input from submission.'
                },
                {
                    name: 'maxLength',
                    type: 'number',
                    description: 'Native UTF-16 length limit, not Python code-point validation.'
                },
                {
                    name: 'Field.orientation',
                    type: '"vertical" | "horizontal" | "responsive"',
                    description: 'Installed field layout.'
                },
                { name: 'FieldLabel.htmlFor', type: 'string', description: 'ID of the labeled control.' },
                {
                    name: 'FieldDescription / FieldError',
                    type: 'components',
                    description: 'Compose helper text and error feedback; connect with aria-describedby.'
                },
                {
                    name: 'FieldSet / FieldLegend / FieldGroup / FieldContent / FieldTitle / FieldSeparator',
                    type: 'components',
                    description: 'Installed shadcn field composition with native element props.'
                },
                {
                    name: 'InputGroup / InputGroupInput / InputGroupTextarea',
                    type: 'components',
                    description: 'Compose grouped controls without changing native input events.'
                },
                {
                    name: 'InputGroupAddon.align',
                    type: '"inline-start" | "inline-end" | "block-start" | "block-end"',
                    description: 'Position an addon within the input group.'
                },
                {
                    name: 'InputGroupButton / InputGroupText',
                    type: 'components',
                    description: 'Compose actions and text inside a group.'
                },
                {
                    name: 'Textarea',
                    type: 'component',
                    description: 'Native textarea props, including rows, defaultValue, disabled, and DOM change events.'
                }
            ]}
            example={{
                title: 'Native name field',
                preview: (
                    <FormPreview>
                        <InputExample />
                    </FormPreview>
                ),
                code: `const schema = z.object({
  name: z.string().trim().min(1, "Enter an order name.")
});

function OrderForm() {
  const form = useForm({ resolver: zodResolver(schema), defaultValues: { name: "" } });
  const submit = useSubmit("/api/orders", {
    onError: () => form.setError("root", { message: "Could not save. Please try again." })
  });

  async function save(values) {
    const data = new FormData();
    data.append("name", values.name);
    await submit(data);
  }

  return (
    <form onSubmit={form.handleSubmit(save)} noValidate>
      <FieldGroup>
        <Controller name="name" control={form.control} render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="order-name">Name</FieldLabel>
            <Input {...field} id="order-name" aria-invalid={fieldState.invalid} />
            <FieldError errors={[fieldState.error]} />
          </Field>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
        <Button type="button" variant="outline" onClick={() => form.reset()}>Reset</Button>
        <FieldError errors={[form.formState.errors.root]} />
      </FieldGroup>
    </form>
  );
}`
            }}
        />
    );
}

/** Shows a labeled native field without an adapter-owned value. */
export function InputExample() {
    return (
        <div className="flex flex-col gap-4">
            <Field>
                <FieldLabel htmlFor="native-name">Name</FieldLabel>
                <Input
                    id="native-name"
                    name="name"
                    defaultValue="New order"
                    required
                    aria-describedby="native-name-description"
                />
                <FieldDescription id="native-name-description">Order name.</FieldDescription>
            </Field>
            <Field>
                <FieldLabel htmlFor="native-quantity">Quantity</FieldLabel>
                <Input
                    id="native-quantity"
                    name="quantity"
                    type="number"
                    defaultValue={3}
                    min={1}
                    max={100}
                    step={1}
                    required
                />
            </Field>
            <Field>
                <FieldLabel htmlFor="native-notes">Notes</FieldLabel>
                <Textarea id="native-notes" name="notes" defaultValue="Order notes" />
            </Field>
        </div>
    );
}
