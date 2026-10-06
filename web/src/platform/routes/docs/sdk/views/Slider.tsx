import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Slider } from '@/components/ui/Slider';

/** Documents Slider in LongLink Views. */
export default function SliderPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Slider"
            examples={[
                {
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
      <Stack gap={3}>
        <Slider name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />
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

/** Shows a named slider whose value is included in native form data. */
export function SliderExample() {
    // Restore the initial progress with the same reset button as other form fields.
    return <Slider name="progress" label="Progress" defaultValue={60} min={0} max={100} step={1} />;
}
