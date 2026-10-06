import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { MultiSelector } from '@/components/ui/MultiSelector';

/** Documents MultiSelector in LongLink Views. */
export default function MultiSelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MultiSelector"
            examples={[
                {
                    title: 'Teams form',
                    preview: (
                        <FormPreview>
                            <MultiSelectorExample />
                        </FormPreview>
                    ),
                    code: `/** Submits selected teams as repeated form entries. */
export default function TeamsForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <MultiSelector
          name="teams"
          label="Teams"
          options={['design', 'engineering', 'support']}
          defaultValue={['design', 'engineering']}
          required
        />
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

/** Shows a themed multiple selector without collapsing repeated submission names. */
export function MultiSelectorExample() {
    // Start with two teams so submission visibly demonstrates repeated entries.
    return (
        <MultiSelector
            name="teams"
            label="Teams"
            options={['design', 'engineering', 'support']}
            defaultValue={['design', 'engineering']}
            required
        />
    );
}
