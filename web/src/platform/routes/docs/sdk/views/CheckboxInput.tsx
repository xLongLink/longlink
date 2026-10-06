import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { CheckboxInput } from '@/components/ui/CheckboxInput';

/** Documents CheckboxInput in LongLink Views. */
export default function CheckboxInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="CheckboxInput"
            examples={[
                {
                    title: 'Approval form',
                    preview: (
                        <FormPreview>
                            <CheckboxInputExample />
                        </FormPreview>
                    ),
                    code: `/** Submits approval only when the checkbox is checked. */
export default function ApprovalForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <CheckboxInput name="approved" label="Approved" defaultChecked />
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

/** Shows a named checkbox whose unchecked value is omitted from submissions. */
export function CheckboxInputExample() {
    // Restore the initial checked state with native form reset behavior.
    return <CheckboxInput name="approved" label="Approved" defaultChecked />;
}
