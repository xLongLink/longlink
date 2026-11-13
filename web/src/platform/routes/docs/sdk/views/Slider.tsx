import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { SliderField } from '@/components/custom/SliderField';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            properties={[
                { name: 'SliderField.label', type: 'string', description: 'SliderField label text.' },
                {
                    name: 'SliderField.description',
                    type: 'string',
                    description: 'SliderField description rendered below the label.'
                },
                {
                    name: 'name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name."
                },
                {
                    name: 'SliderField.required',
                    type: 'boolean',
                    description: 'Marks the SliderField label as required; sliders always have a value.'
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents interaction and excludes the field from submission.'
                },
                { name: 'min', type: 'number', description: 'Minimum value.' },
                { name: 'max', type: 'number', description: 'Maximum value.' },
                { name: 'step', type: 'number', description: 'Step increment.' },
                {
                    name: 'value',
                    type: 'number | readonly number[]',
                    description: 'Current value: a number for one thumb or a readonly number array for multiple thumbs.'
                },
                { name: 'defaultValue', type: 'number | readonly number[]', description: 'Initial value.' },
                {
                    name: 'onValueChange',
                    type: '(value, eventDetails) => void',
                    description: 'Native callback fired when the value changes.'
                },
                {
                    name: 'onValueCommitted',
                    type: '(value, eventDetails) => void',
                    description: 'Native callback fired when an interaction commits a value.'
                },
                {
                    name: 'minStepsBetweenValues',
                    type: 'number',
                    description:
                        'Minimum number of steps between thumbs in range mode; prevents thumbs from overlapping.'
                }
            ]}
            example={{
                title: 'Progress form',
                preview: (
                    <FormPreview>
                        <SliderExample />
                    </FormPreview>
                ),
                code: `/** Submits progress without keeping a separate draft value. */
export default function ProgressForm() {
  return (
    <Form action="/api/example" method="post">
      <SliderField name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" variant="default">Submit</Button>
      </Stack>
    </Form>
  );
}`
            }}
        />
    );
}

/** Shows a named slider whose value is included in native form data. */
export function SliderExample() {
    // Delegate editing and named form inputs to the native slider.
    return <SliderField name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />;
}
