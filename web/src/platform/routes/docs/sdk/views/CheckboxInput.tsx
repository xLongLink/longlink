import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { CheckboxInput } from '@/components/ui/CheckboxInput';

/** Documents CheckboxInput in LongLink Views. */
export default function CheckboxInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="CheckboxInput"
            introduction={'Edits a boolean or indeterminate field.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for the checkbox (always rendered for accessibility).',
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
                    type: 'boolean | "indeterminate"',
                    description: 'Whether the checkbox is checked, unchecked, or indeterminate.',
                },
                {
                    name: 'defaultChecked',
                    type: 'boolean',
                    description: 'Initial checked state.',
                },
                {
                    name: 'onChange',
                    type: '(value: boolean) => void',
                    description: 'Callback fired when the checkbox state changes.',
                },
            ]}
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
      <CheckboxInput name="approved" label="Approved" defaultChecked />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" label="Submit" variant="primary" />
        <Button type="reset" label="Reset" />
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
