import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TextArea } from '@/components/ui/TextArea';

/** Documents TextArea in LongLink Views. */
export default function TextAreaPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextArea"
            introduction={
                'Edits themed multi-line text with native form serialization. Required fields cannot be blank.'
            }
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for the textarea. Always rendered for accessibility.',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Helper text displayed between the label and textarea.',
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
                    type: 'string',
                    description: 'Current value of the textarea.',
                },
                {
                    name: 'defaultValue',
                    type: 'string',
                    description: 'Initial value.',
                },
                {
                    name: 'onChange',
                    type: '(value: string) => void',
                    description: 'Callback fired when the textarea value changes.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown when the textarea is empty.',
                },
                {
                    name: 'rows',
                    type: 'number',
                    description: 'Number of visible text rows.',
                },
                {
                    name: 'maxLength',
                    type: 'number',
                    description:
                        'Maximum Unicode code points, matching Python string length. Validates without truncating input.',
                },
                {
                    name: 'autoComplete',
                    type: 'string',
                    description: 'Native autocomplete hint.',
                },
            ]}
            example={{
                title: 'Notes form',
                preview: (
                    <FormPreview>
                        <TextAreaExample />
                    </FormPreview>
                ),
                code: `/** Submits multi-line notes using a themed textarea. */
export default function NotesForm() {
  return (
    <Form action="/api/example" method="post">
      <TextArea name="notes" label="Notes" defaultValue="Review complete" rows={2} maxLength={500} required />
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

/** Shows a themed notes field with a maximum length and resettable initial value. */
export function TextAreaExample() {
    // Keep editing and length validation inside the control rather than maintaining draft state.
    return <TextArea name="notes" label="Notes" defaultValue="Review complete" rows={2} maxLength={500} required />;
}
