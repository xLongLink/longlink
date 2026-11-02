import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { NumberInput } from '@/components/ui/NumberInput';

/** Documents NumberInput in LongLink Views. */
export default function NumberInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="NumberInput"
            introduction={'Edits a constrained number without wheel editing or custom value formatting.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for the input (always rendered for accessibility).',
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
                    type: 'number | null',
                    description: 'Current value of the input.',
                },
                {
                    name: 'defaultValue',
                    type: 'number',
                    description: 'Initial value.',
                },
                {
                    name: 'min',
                    type: 'number | null',
                    description: 'Minimum value allowed. A smaller entry commits at this value on blur or Enter.',
                },
                {
                    name: 'max',
                    type: 'number | null',
                    description: 'Maximum value allowed. A larger entry commits at this value on blur or Enter.',
                },
                {
                    name: 'step',
                    type: 'number | null',
                    description: 'Step increment for the input.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text.',
                },
                {
                    name: 'units',
                    type: 'string | null',
                    description: 'Units text to display at the end of the input (e.g., "%" or "GB").',
                },
                {
                    name: 'isIntegerOnly',
                    type: 'boolean',
                    description: 'Only allow integer values (no floating point).',
                },
                {
                    name: 'autoComplete',
                    type: 'string',
                    description: 'HTML autocomplete attribute.',
                },
                {
                    name: 'onChange',
                    type: '(value: number | null) => void',
                    description: 'Receives committed edits, step changes, or cleared values.',
                },
            ]}
            example={{
                title: 'Quantity form',
                preview: (
                    <FormPreview>
                        <NumberInputExample />
                    </FormPreview>
                ),
                code: `/** Submits a bounded integer quantity as a form field. */
export default function QuantityForm() {
  return (
    <Form action="/api/example" method="post">
      <NumberInput name="quantity" label="Quantity" defaultValue={3} min={1} max={100} step={1} required />
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

/** Shows a themed integer quantity field with constrained bounds. */
export function NumberInputExample() {
    // Invalid quantities cannot submit; valid values retain HTML string serialization.
    return <NumberInput name="quantity" label="Quantity" defaultValue={3} min={1} max={100} step={1} required />;
}
