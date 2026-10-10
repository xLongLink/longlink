import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TextInput } from '@/components/ui/TextInput';
import { NumberInput } from '@/components/ui/NumberInput';

/** Documents browser-native form authoring using a local, non-networked submission preview. */
export default function FormPage() {
    // Keep LongLink-specific examples and guidance beside the generated field contract.
    return (
        <ViewLayout
            name="Form"
            introduction="Form submits named fields to a Solution API without draft state, imports, or page navigation. Form validation runs before the request; Python schemas remain authoritative."
            examples={[
                {
                    title: 'Create an item form',
                    preview: <FormExample />,
                    code: `/** Creates an item using named themed fields. */
export default function CreateItem() {
  return (
    <Form action="/api/items" method="post">
      <Stack gap={3}>
        <TextInput name="name" label="Name" required />
        <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
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

/** Shows a complete form with local submission output and native reset behavior. */
function FormExample() {
    // Exercise the real Form with a local capability rather than disabling its controls.
    return (
        <FormPreview>
            <TextInput name="name" label="Name" required />
            <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
        </FormPreview>
    );
}
