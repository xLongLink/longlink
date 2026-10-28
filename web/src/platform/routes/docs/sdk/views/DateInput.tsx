import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { DateInput } from '@/components/ui/DateInput';

/** Documents DateInput in LongLink Views. */
export default function DateInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateInput"
            introduction={'Selects a constrained date with standard month and week presentation.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text.',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Helper text displayed below the label.',
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
                    type: '`${number}${number}${number}${number}-${number}${number}-${number}${number}`',
                    description: 'Selected date in YYYY-MM-DD format.',
                },
                {
                    name: 'defaultValue',
                    type: '`${number}${number}${number}${number}-${number}${number}-${number}${number}`',
                    description: 'Initial value.',
                },
                {
                    name: 'onChange',
                    type: '(value: `${number}${number}${number}${number}-${number}${number}-${number}${number}` | undefined) => void',
                    description: 'Callback invoked when the selected date changes.',
                },
                {
                    name: 'min',
                    type: '`${number}${number}${number}${number}-${number}${number}-${number}${number}`',
                    description: 'Minimum selectable date (YYYY-MM-DD).',
                },
                {
                    name: 'max',
                    type: '`${number}${number}${number}${number}-${number}${number}-${number}${number}`',
                    description: 'Maximum selectable date (YYYY-MM-DD).',
                },
                {
                    name: 'dateConstraints',
                    type: 'readonly ((date: Date) => boolean)[]',
                    description: 'Additional constraints applied to the themed calendar picker.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown in the text input.',
                },
            ]}
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
      <DateInput name="due_date" label="Due date" defaultValue="2026-10-02" required />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" label="Submit" variant="primary" />
        <Button type="reset" label="Reset" />
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
      <DateInput name="start_date" label="Start date" defaultValue="2026-10-02" required />
      <DateInput name="end_date" label="End date" defaultValue="2026-10-09" required />
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

/** Shows a themed date picker with a resettable ISO date. */
export function DateInputExample() {
    // Keep date editing and required validation inside the themed form control.
    return <DateInput name="due_date" label="Due date" defaultValue="2026-10-02" required />;
}
