import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TimeInput } from '@/components/ui/TimeInput';

/** Documents TimeInput in LongLink Views. */
export default function TimeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TimeInput"
            introduction={'Selects a constrained time using the standard picker.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for the input (required for accessibility).',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Description text displayed between the label and input.',
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
                    type: 'ISOTimeString',
                    description: 'Controlled time value in ISO format (HH:MM or HH:MM:SS).',
                },
                {
                    name: 'defaultValue',
                    type: 'ISOTimeString',
                    description: 'Initial value.',
                },
                {
                    name: 'onChange',
                    type: '(value: ISOTimeString | undefined) => void',
                    description: 'Callback fired when the time changes. Receives undefined when the input is cleared.',
                },
                {
                    name: 'min',
                    type: 'ISOTimeString',
                    description: 'Minimum selectable time in ISO format. Values outside the range are rejected.',
                },
                {
                    name: 'max',
                    type: 'ISOTimeString',
                    description: 'Maximum selectable time in ISO format. Values outside the range are rejected.',
                },
                {
                    name: 'hasSeconds',
                    type: 'boolean',
                    description: 'Includes seconds in the time display and parsing.',
                },
                {
                    name: 'hourFormat',
                    type: '"12h" | "24h"',
                    description: '12-hour or 24-hour time display.',
                },
                {
                    name: 'increment',
                    type: 'number',
                    description: 'Number of minutes to add or subtract when the user presses the up or down arrow key.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Empty-field text, replaced by a format hint on focus.',
                },
            ]}
            example={{
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
      <TimeInput name="start_time" label="Start time" required />
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

/** Shows a required themed time picker without a draft value. */
export function TimeInputExample() {
    // Form validation requires a time before submission.
    return <TimeInput name="start_time" label="Start time" required />;
}
