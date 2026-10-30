import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Step, Stepper } from '@/components/ui/Stepper';
import { NumberInput } from '@/components/ui/NumberInput';

/** Documents browser-native form authoring using a local, non-networked submission preview. */
export default function FormPage() {
    // Keep LongLink-specific examples and guidance beside the field contract.
    return (
        <ViewLayout
            name="Form"
            isLongLinkSpecific
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Named fields and layout, including a Stepper in wizard mode.',
                },
                {
                    name: 'action',
                    type: 'string',
                    description: 'Solution-relative API path; external URLs are not supported.',
                },
                {
                    name: 'method',
                    type: '"delete" | "post" | "put" | "patch"',
                    description: 'Write method used to submit the form; defaults to post.',
                },
                {
                    name: 'id',
                    type: 'string',
                    description: 'Native form ID for associating external submit or reset buttons.',
                },
                {
                    name: 'height',
                    type: 'string | number',
                    description: 'Optional form height. Stepper owns its wizard panel layout.',
                },
                {
                    name: 'onSuccess',
                    type: '(data: ViewData) => void | Promise<void>',
                    description: 'Runs after a successful write and automatic cached-data refresh.',
                },
            ]}
            introduction={
                'Form submits named fields to a Solution API without draft state, imports, or page navigation. Form owns validation, submission, and pending state; unexpected submission failures reach the shared error boundary. Python schemas remain authoritative. For multiple steps, place a Stepper with variant="wizard" inside Form and put a submit Button in its last Step. Stepper owns Next/Back navigation and keeps inactive fields mounted. Final validation reveals the first invalid step before focusing its field. Without a Stepper, Form works as a regular form.'
            }
            example={{
                title: 'Create an item form',
                preview: <FormExample />,
                code: `/** Creates an item using persistent steps and one final submission. */
export default function CreateItem() {
  return (
    <Form action="/api/items" method="post">
      <Stepper variant="wizard">
        <Step label="Identity">
          <TextInput name="name" label="Name" required />
        </Step>
        <Step label="Details">
          <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
          <Button type="submit" label="Create item" variant="primary" />
        </Step>
      </Stepper>
    </Form>
  );
}`,
            }}
        />
    );
}

/** Shows a complete form with local submission output and native reset behavior. */
function FormExample() {
    // Exercise the real Form with a local capability rather than disabling its controls.
    return (
        <FormPreview stepped>
            <Stepper variant="wizard">
                <Step label="Identity">
                    <TextInput name="name" label="Name" required />
                </Step>
                <Step label="Details">
                    <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
                    <Button type="submit" label="Create item" variant="primary" />
                </Step>
            </Stepper>
        </FormPreview>
    );
}
