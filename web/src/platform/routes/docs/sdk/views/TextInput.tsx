import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TextInput } from '@/components/ui/TextInput';

/** Documents TextInput in LongLink Views. */
export default function TextInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextInput"
            examples={[
                {
                    title: 'Name form',
                    preview: (
                        <FormPreview>
                            <TextInputExample />
                        </FormPreview>
                    ),
                    code: `/** Submits a name without draft state. */
export default function NameForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <TextInput name="name" label="Name" defaultValue="New order" required />
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

/** Shows a themed name field with a resettable initial value. */
export function TextInputExample() {
    // Let the themed control own editing, required validation, and reset behavior.
    return <TextInput name="name" label="Name" defaultValue="New order" required />;
}
