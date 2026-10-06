import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { NumberInput } from '@/components/ui/NumberInput';

/** Documents NumberInput in LongLink Views. */
export default function NumberInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="NumberInput"
            examples={[
                {
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
      <Stack gap={3}>
        <NumberInput name="quantity" label="Quantity" defaultValue={3} min={1} max={100} step={1} required />
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

/** Shows a themed integer quantity field with constrained bounds. */
export function NumberInputExample() {
    // Invalid quantities cannot submit; valid values retain HTML string serialization.
    return <NumberInput name="quantity" label="Quantity" defaultValue={3} min={1} max={100} step={1} required />;
}
