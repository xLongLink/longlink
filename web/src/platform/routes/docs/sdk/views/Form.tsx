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
            reference={{
                introduction:
                    'Form submits named fields to a Solution API without draft state, imports, or page navigation. Form validation runs before the request; Python schemas remain authoritative.',
                practices: [
                    {
                        guidance: true,
                        description:
                            'The bridge accepts at most 32 form entries and 2,000,000 bytes of values and field names. Keep file uploads below that total; the sample uses a 1.9 MB file limit.',
                    },
                    {
                        guidance: true,
                        description:
                            'Use name with defaultValue or defaultChecked for themed fields. Keep value and onChange only when the interface needs reactive state.',
                    },
                    {
                        guidance: true,
                        description:
                            'Named controls retain Astryx styling, calendars, search, clear buttons, and other configured behavior. Adding name never replaces them with plain browser widgets.',
                    },
                    {
                        guidance: true,
                        description:
                            'Receive form fields with Annotated[YourSchema, fastapi.Form()] and install python-multipart. Values are strings, repeated names stay repeated, unchecked checkboxes are omitted, and files retain their filenames.',
                    },
                    {
                        guidance: true,
                        description:
                            'Use onSuccess to close a dialog or navigate. Writes refresh cached data automatically. Successful submission does not reset the form; a reset button restores native defaults.',
                    },
                    {
                        guidance: true,
                        description:
                            'Use DateInput and TimeInput with separate names for appointments. They submit local values without timezone conversion. Use two DateInput fields for date ranges and validate their order in the backend schema.',
                    },
                    {
                        guidance: false,
                        description:
                            'Do not use external actions or direct fetch. Form uses the same restricted Solution request bridge, limits, and error handling as request().',
                    },
                ],
            }}
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
