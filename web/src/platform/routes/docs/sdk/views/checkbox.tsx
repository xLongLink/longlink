import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Label } from '@/components/shadcn/label';
import { Checkbox } from '@/components/shadcn/checkbox';

/** Documents Checkbox in LongLink Views. */
export default function CheckboxPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Checkbox"
            properties={[
                { name: 'id', type: 'string', description: 'ID of the input element.' },
                { name: 'name', type: 'string', description: 'Identifies the field when a form is submitted.' },
                { name: 'form', type: 'string', description: 'ID of the form that owns the hidden input.' },
                {
                    name: 'value',
                    type: 'string',
                    description: 'Value submitted when checked. Defaults to "on" for form submission.'
                },
                {
                    name: 'uncheckedValue',
                    type: 'string',
                    description: 'Value submitted when unchecked. Omitted by default.'
                },
                {
                    name: 'required',
                    type: 'boolean',
                    description: 'Requires the checkbox to be checked before submission.'
                },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents interaction and excludes the field from submission.'
                },
                { name: 'readOnly', type: 'boolean', description: 'Prevents changes to the checked state.' },
                { name: 'defaultChecked', type: 'boolean', description: 'Initial checked state.' },
                {
                    name: 'checked',
                    type: 'boolean',
                    description: 'Controlled checked state. Use defaultChecked for an uncontrolled checkbox.'
                },
                {
                    name: 'onCheckedChange',
                    type: '(checked: boolean, eventDetails: Checkbox.Root.ChangeEventDetails) => void',
                    description: 'Receives the next checked state and Base UI event details.'
                },
                {
                    name: 'indeterminate',
                    type: 'boolean',
                    description: 'Displays a mixed state independently of the checked value.'
                },
                {
                    name: 'inputRef',
                    type: 'React.Ref<HTMLInputElement>',
                    description: 'Ref to the hidden input element.'
                },
                {
                    name: 'parent',
                    type: 'boolean',
                    description: 'Controls child checkboxes within a Base UI CheckboxGroup.'
                }
            ]}
            example={{
                title: 'Approval form',
                preview: (
                    <FormPreview>
                        <div className="flex justify-center">
                            <CheckboxExample />
                        </div>
                    </FormPreview>
                ),
                code: `/** Submits approval only when the checkbox is checked. */
export default function ApprovalForm() {
  return (
    <Form action="/api/example" method="post">
      <Label>
        <Checkbox name="approved" defaultChecked />
        Approved
      </Label>
    </Form>
  );
}`
            }}
        />
    );
}

/** Shows a named checkbox whose unchecked value is omitted from submissions. */
export function CheckboxExample() {
    // Restore the initial checked state with native form reset behavior.
    return (
        <Label>
            <Checkbox name="approved" defaultChecked />
            Approved
        </Label>
    );
}
