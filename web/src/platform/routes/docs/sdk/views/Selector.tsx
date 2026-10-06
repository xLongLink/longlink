import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Selector } from '@/components/ui/Selector';

/** Documents Selector in LongLink Views. */
export default function SelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Selector"
            examples={[
                {
                    title: 'Status form',
                    preview: (
                        <FormPreview>
                            <SelectorExample />
                        </FormPreview>
                    ),
                    code: `/** Submits one selected status using a themed selector. */
export default function StatusForm() {
  return (
    <Form action="/api/example" method="post">
      <Stack gap={3}>
        <Selector name="status" label="Status" options={['open', 'closed']} defaultValue="open" required />
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

/** Shows a themed status selector with a resettable initial selection. */
export function SelectorExample() {
    // Selection submits one string and enforces a required choice.
    return <Selector name="status" label="Status" options={['open', 'closed']} defaultValue="open" required />;
}
