import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Switch } from '@/components/shadcn/switch';
import { SwitchField } from '@/components/custom/switch-field';

/** Documents Switch in LongLink Views. */
export default function SwitchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Switch"
            properties={[
                { name: 'checked', type: 'boolean', description: 'Controlled checked state.' },
                {
                    name: 'onCheckedChange',
                    type: '(checked: boolean, eventDetails) => void',
                    description: 'Called with the next checked state and Base UI event details.'
                },
                { name: 'size', type: '"sm" | "default"', description: 'Installed switch size.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables the native control, including keyboard focus and form submission.'
                },
                { name: 'name', type: 'string', description: 'Form submission name.' },
                { name: 'defaultChecked', type: 'boolean', description: 'Initial uncontrolled checked state.' },
                {
                    name: 'SwitchField.label',
                    type: 'string',
                    description: 'Label text for the switch (always rendered for accessibility).'
                },
                {
                    name: 'SwitchField.description',
                    type: 'string',
                    description: 'Description text displayed below the label.'
                },
                {
                    name: 'SwitchField.name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name."
                },
                {
                    name: 'SwitchField.required',
                    type: 'boolean',
                    description: 'Requires a value before native form submission.'
                },
                {
                    name: 'SwitchField.disabled',
                    type: 'boolean',
                    description: 'Prevents edits and submission while keeping the control keyboard-focusable.'
                },
                { name: 'SwitchField.value', type: 'boolean', description: 'Whether the switch is on or off.' },
                { name: 'SwitchField.defaultChecked', type: 'boolean', description: 'Initial checked state.' },
                {
                    name: 'SwitchField.onChange',
                    type: '(value: boolean) => void',
                    description: 'Callback fired when the switch state changes.'
                }
            ]}
            example={{
                title: 'Preference form',
                preview: (
                    <FormPreview>
                        <div className="mx-auto w-fit">
                            <SwitchField name="notifications" label="Notifications" defaultChecked />
                        </div>
                    </FormPreview>
                ),
                code: `/** Submits an enabled preference using checkbox semantics. */
export default function PreferenceForm() {
  const form = useForm({ defaultValues: { notifications: true } });
  const submit = useSubmit("/api/example", {
    onError: () => form.setError("root", { message: "Could not save. Please try again." })
  });

  async function save(values) {
    const data = new FormData();
    if (values.notifications) data.append("notifications", "on");
    await submit(data);
  }

  return (
    <form onSubmit={form.handleSubmit(save)}>
      <div className="mx-auto w-fit">
        <Controller name="notifications" control={form.control} render={({ field }) => (
          <SwitchField label="Notifications" value={field.value} onChange={field.onChange} />
        )} />
      </div>
      <Button type="submit" disabled={form.formState.isSubmitting}>Save</Button>
      <FieldError errors={[form.formState.errors.root]} />
    </form>
  );
}`
            }}
        />
    );
}

/** Shows a named switch with a resettable initial setting. */
export function SwitchExample() {
    // Native submission includes "on" only while this preference is enabled.
    return <Switch name="enabled" aria-label="Enabled" size="sm" defaultChecked />;
}
