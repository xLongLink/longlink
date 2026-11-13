import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Switch } from '@/components/shadcn/switch';
import { SwitchField } from '@/components/custom/SwitchField';

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
                        <SwitchExample />
                        <SwitchField name="notifications" label="Notifications" defaultChecked />
                    </FormPreview>
                ),
                code: `/** Submits an enabled preference using checkbox semantics. */
export default function PreferenceForm() {
  return (
    <Form action="/api/example" method="post">
      <Switch name="enabled" aria-label="Enabled" size="sm" defaultChecked />
      <SwitchField name="notifications" label="Notifications" defaultChecked />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" variant="default">Submit</Button>
        <Button type="reset" variant="outline">Reset</Button>
      </Stack>
    </Form>
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
