import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Selector } from '@/components/ui/Selector';

/** Documents Selector in LongLink Views. */
export default function SelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Selector"
            introduction={'Selects one value without custom option rendering or popup geometry.'}
            properties={[
                {
                    name: 'label',
                    type: 'string',
                    description: 'Label text for accessibility.',
                },
                {
                    name: 'description',
                    type: 'string',
                    description: 'Helper text displayed below the label.',
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
                    name: 'options',
                    type: 'SelectorOptionType[]',
                    description: 'Selectable options, dividers, or titled sections.',
                },
                {
                    name: 'defaultValue',
                    type: 'string',
                    description: 'Initial value.',
                },
                {
                    name: 'hasSearch',
                    type: 'boolean',
                    description: 'Shows a search field for filtering options.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown when no value is selected.',
                },
                {
                    name: 'value',
                    type: 'string | null',
                    description: 'Currently selected value.',
                },
                {
                    name: 'onChange',
                    type: '(value: string | null) => void',
                    description: 'Callback fired when the selection changes.',
                },
            ]}
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
      <Selector name="status" label="Status" options={['open', 'closed']} defaultValue="open" required />
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

/** Shows a themed status selector with a resettable initial selection. */
export function SelectorExample() {
    // Selection submits one string and enforces a required choice.
    return <Selector name="status" label="Status" options={['open', 'closed']} defaultValue="open" required />;
}
