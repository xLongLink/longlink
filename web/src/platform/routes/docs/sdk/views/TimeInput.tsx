import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TimeInput } from '@/components/ui/TimeInput';

/** Documents TimeInput in LongLink Views. */
export default function TimeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TimeInput"
            examples={[
                {
                    title: 'Start time form',
                    preview: (
                        <FormPreview>
                            <TimeInputExample />
                        </FormPreview>
                    ),
                    code: `/** Submits a local time using the themed time picker. */
export default function StartTimeForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <TimeInput name="start_time" label="Start time" required />
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

/** Shows a required themed time picker without a draft value. */
export function TimeInputExample() {
    // Form validation requires a time before submission.
    return <TimeInput name="start_time" label="Start time" required />;
}
