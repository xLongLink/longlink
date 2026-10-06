import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TextArea } from '@/components/ui/TextArea';

/** Documents TextArea in LongLink Views. */
export default function TextAreaPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextArea"
            examples={[
                {
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
      <Stack gap={3}>
        <TextArea name="notes" label="Notes" defaultValue="Review complete" rows={2} maxLength={500} required />
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

/** Shows a themed notes field with a maximum length and resettable initial value. */
export function TextAreaExample() {
    // Keep editing and length validation inside the control rather than maintaining draft state.
    return <TextArea name="notes" label="Notes" defaultValue="Review complete" rows={2} maxLength={500} required />;
}
