import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { TextInput } from '@/components/ui/TextInput';

/** Documents TextInput in LongLink Views. */
export default function TextInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TextInput"
            introduction={
                'Edits themed text with optional local state and native form serialization. Required fields cannot be blank.'
            }
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for the input: always rendered for accessibility.',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Description text displayed between the label and input.',
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
                    name: 'value',
                    type: 'string',
                    description: 'Current value of the input.',
                },
                {
                    name: 'defaultValue',
                    type: 'string',
                    description: 'Initial value.',
                },
                {
                    name: 'onChange',
                    type: '(value: string) => void',
                    description: 'Callback fired when the input value changes.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown when the input is empty.',
                },
                {
                    name: 'maxLength',
                    type: 'number',
                    description:
                        'Maximum Unicode code points, matching Python string length. Validates without truncating input.',
                },
                {
                    name: 'type',
                    type: '"text" | "password" | "email"',
                    description: 'The HTML input type.',
                },
                {
                    name: 'autoComplete',
                    type: 'string',
                    description: 'Native autocomplete hint.',
                },
                {
                    name: 'startIcon',
                    type: 'ReactNode',
                    description: 'Icon displayed at the start of the input.',
                },
                {
                    name: 'onEnter',
                    type: '() => void',
                    description: 'Runs on Enter, except when confirming an IME composition.',
                },
            ]}
            examples={[
                {
                    title: 'Name form',
                    preview: (
                        <FormPreview>
                            <TextInputExample />
                        </FormPreview>
                    ),
                    code: `/** Submits a name without draft state. */
export default function NameForm() {
  return (
    <Form action="/api/example" method="post">
      <TextInput name="name" label="Name" defaultValue="New order" required />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" label="Submit" variant="primary" />
        <Button type="reset" label="Reset" />
      </Stack>
    </Form>
  );
}`,
                },
            ]}
        />
    );
}

/** Shows a themed name field with a resettable initial value. */
export function TextInputExample() {
    // Let the themed control own editing, required validation, and reset behavior.
    return <TextInput name="name" label="Name" defaultValue="New order" required />;
}
