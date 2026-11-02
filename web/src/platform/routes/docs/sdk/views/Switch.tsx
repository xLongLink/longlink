import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Switch } from '@/components/ui/Switch';

/** Documents Switch in LongLink Views. */
export default function SwitchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Switch"
            introduction={'Edits an on/off setting using one controlled change handler.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for the switch (always rendered for accessibility).',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Description text displayed below the label.',
                },
                {
                    name: 'name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name.",
                },
                {
                    name: 'required',
                    type: 'boolean',
                    description: 'Requires a value before native form submission.',
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents interaction and excludes the field from submission.',
                },
                {
                    name: 'value',
                    type: 'boolean',
                    description: 'Whether the switch is on or off.',
                },
                {
                    name: 'defaultChecked',
                    type: 'boolean',
                    description: 'Initial checked state.',
                },
                {
                    name: 'onChange',
                    type: '(value: boolean) => void',
                    description: 'Callback fired when the switch state changes.',
                },
            ]}
            example={{
                title: 'Preference form',
                preview: (
                    <FormPreview>
                        <SwitchExample />
                    </FormPreview>
                ),
                code: `/** Submits an enabled preference using checkbox semantics. */
export default function PreferenceForm() {
  return (
    <Form action="/api/example" method="post">
      <Switch name="enabled" label="Enabled" defaultChecked />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" label="Submit" variant="primary" />
        <Button type="reset" label="Reset" />
      </Stack>
    </Form>
  );
}`,
            }}
        />
    );
}

/** Shows a named switch with a resettable initial setting. */
export function SwitchExample() {
    // Native submission includes "on" only while this preference is enabled.
    return <Switch name="enabled" label="Enabled" defaultChecked />;
}
