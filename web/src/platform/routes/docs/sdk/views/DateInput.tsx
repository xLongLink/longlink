import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { DateInput } from '@/components/ui/DateInput';

/** Documents DateInput in LongLink Views. */
export default function DateInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateInput"
            examples={[
                {
                    title: 'Due date form',
                    preview: (
                        <FormPreview>
                            <DateInputExample />
                        </FormPreview>
                    ),
                    code: `/** Submits an ISO date using the themed calendar picker. */
export default function DueDateForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <DateInput name="due_date" label="Due date" defaultValue="2026-10-02" required />
        <Stack direction="horizontal" gap={2}>
          <Button type="submit" label="Submit" variant="primary" />
          <Button type="reset" label="Reset" />
        </Stack>
      </Stack>
    </Form>
  );
}`,
                },
                {
                    title: 'Date range with two fields',
                    preview: (
                        <FormPreview>
                            <DateInput name="start_date" label="Start date" defaultValue="2026-10-02" required />
                            <DateInput name="end_date" label="End date" defaultValue="2026-10-09" required />
                        </FormPreview>
                    ),
                    code: `/** Submits a range as two independently named dates. */
export default function PeriodForm() {
  // Validate end_date >= start_date in the receiving backend schema.
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <DateInput name="start_date" label="Start date" defaultValue="2026-10-02" required />
        <DateInput name="end_date" label="End date" defaultValue="2026-10-09" required />
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

/** Shows a themed date picker with a resettable ISO date. */
export function DateInputExample() {
    // Keep date editing and required validation inside the themed form control.
    return <DateInput name="due_date" label="Due date" defaultValue="2026-10-02" required />;
}
