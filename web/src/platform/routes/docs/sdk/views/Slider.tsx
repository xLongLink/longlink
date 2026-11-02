import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Slider } from '@/components/ui/Slider';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            introduction={'Edits a number or range using a standard horizontal slider.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text (always rendered for accessibility).',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Description text rendered below the label.',
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
                    name: 'min',
                    type: 'number',
                    description: 'Minimum value.',
                },
                {
                    name: 'max',
                    type: 'number',
                    description: 'Maximum value.',
                },
                {
                    name: 'step',
                    type: 'number',
                    description: 'Step increment.',
                },
                {
                    name: 'value',
                    type: '(number) | ([number, number])',
                    description:
                        'Current value: a `number` for single thumb mode or `[number, number]` for range mode.',
                },
                {
                    name: 'defaultValue',
                    type: '(number) | ([number, number])',
                    description: 'Initial value.',
                },
                {
                    name: 'onChange',
                    type: '((value: number) => void) | ((value: [number, number]) => void)',
                    description: 'Callback fired on value change during drag.',
                },
                {
                    name: 'onChangeEnd',
                    type: '((value: number) => void) | ((value: [number, number]) => void)',
                    description: 'Callback fired when drag ends.',
                },
                {
                    name: 'minStepsBetweenThumbs',
                    type: 'number',
                    description:
                        'Minimum number of steps between thumbs in range mode; prevents thumbs from overlapping.',
                },
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
      <Slider name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />
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

/** Shows a named slider whose value is included in native form data. */
export function SliderExample() {
    // Restore the initial progress with the same reset button as other form fields.
    return <Slider name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />;
}
