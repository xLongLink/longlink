import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/TextInput';
import { Step, Wizard } from '@/components/ui/Stepper';
import { NumberInput } from '@/components/ui/NumberInput';

/** Documents browser-native form authoring using a local, non-networked submission preview. */
export default function FormPage() {
    // Keep LongLink-specific examples and guidance beside the field contract.
    return (
        <ViewLayout
            name="Form"
            properties={[
                {
                    name: 'children',
                    type: 'ReactNode',
                    description: 'Named fields and layout, including a custom Wizard.',
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
                    description: 'Optional form height. Wizard owns its panel layout.',
                },
                {
                    name: 'onSuccess',
                    type: '(data: ViewData) => void | Promise<void>',
                    description: 'Runs after a successful write and automatic cached-data refresh.',
                },
            ]}
            example={{
                title: 'Create an item form',
                preview: <FormExample />,
                code: `/** Creates an item using persistent steps and one final submission. */
export default function CreateItem() {
  return (
    <Form action="/api/items" method="post">
      <Wizard>
        <Step label="Identity">
          <TextInput name="name" label="Name" required />
        </Step>
        <Step label="Details">
          <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
          <Button type="submit" variant="default">Create item</Button>
        </Step>
      </Wizard>
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
            <Wizard>
                <Step label="Identity">
                    <TextInput name="name" label="Name" required />
                </Step>
                <Step label="Details">
                    <NumberInput name="price" label="Price" min={0} defaultValue={0} required />
                    <Button type="submit" variant="default">
                        Create item
                    </Button>
                </Step>
            </Wizard>
        </FormPreview>
    );
}
