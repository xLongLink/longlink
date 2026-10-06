import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Switch } from '@/components/ui/Switch';

/** Documents Switch in LongLink Views. */
export default function SwitchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Switch"
            examples={[
                {
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
      <Stack gap={3}>
        <Switch name="enabled" label="Enabled" defaultChecked />
        <Stack direction="horizontal" gap={2}>
          <Button type="submit" label="Submit" variant="primary" />
          <Button type="reset" label="Reset" />
        </Stack>
      </Stack>
    </Form>
  );
}`,
                },
            ]}
        />
    );
}

/** Shows a named switch with a resettable initial setting. */
export function SwitchExample() {
    // Native submission includes "on" only while this preference is enabled.
    return <Switch name="enabled" label="Enabled" defaultChecked />;
}
