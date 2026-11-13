import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Selector } from '@/components/ui/Selector';

/** Documents Selector in LongLink Views. */
export default function SelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Selector"
            properties={[
                { name: 'label', type: 'string', description: 'Label text for accessibility.' },
                { name: 'description', type: 'string', description: 'Helper text displayed below the label.' },
                {
                    name: 'name',
                    type: 'string',
                    description: "Includes the themed control's value under this form submission name."
                },
                { name: 'required', type: 'boolean', description: 'Requires a value before native form submission.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Prevents interaction and excludes the field from submission.'
                },
                {
                    name: 'options',
                    type: 'SelectorOptionType[]',
                    description: 'Selectable options, dividers, or titled sections.'
                },
                {
                    name: 'defaultValue',
                    type: 'string',
                    description: 'Initial uncontrolled value restored by an uncanceled native form reset.'
                },
                { name: 'hasSearch', type: 'boolean', description: 'Shows a search field for filtering options.' },
                {
                    name: 'hasClear',
                    type: 'boolean',
                    description: 'Shows the clear action by default; clearing reports null and submits an empty string.'
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown when no value is selected.'
                },
                {
                    name: 'value',
                    type: 'string | null',
                    description: 'Caller-owned selection, including null. Retaining it rejects a proposed change.'
                },
                {
                    name: 'onChange',
                    type: '(value: string | null) => void',
                    description: 'Proposes a selection or null when cleared; does not override a controlled value.'
                }
            ]}
            example={{
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
      <Selector name="status" label="Status" options={['open', 'closed']} defaultValue="open" required />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" variant="default">Submit</Button>
        <Button type="reset" variant="outline">Reset</Button>
      </Stack>
    </Form>
  );
}`
            }}
        />
    );
}

/** Shows a themed status selector with a resettable initial selection. */
export function SelectorExample() {
    // Selection submits one string and enforces a required choice.
    return <Selector name="status" label="Status" options={['open', 'closed']} defaultValue="open" required />;
}
