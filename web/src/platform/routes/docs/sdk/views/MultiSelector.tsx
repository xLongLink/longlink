import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { MultiSelector } from '@/components/ui/MultiSelector';

/** Documents MultiSelector in LongLink Views. */
export default function MultiSelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MultiSelector"
            introduction={'Selects multiple values using standard option and selected-value rendering.'}
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
                    description: 'Options, dividers, or sections, with optional per-option actions.',
                },
                {
                    name: 'value',
                    type: 'string[]',
                    description: 'Currently selected values.',
                },
                {
                    name: 'defaultValue',
                    type: 'string[]',
                    description: 'Initial value.',
                },
                {
                    name: 'onChange',
                    type: '(value: string[]) => void',
                    description: 'Receives selected values and an optional descriptor when creating an option.',
                },
                {
                    name: 'placeholder',
                    type: 'string',
                    description: 'Placeholder text shown when no value is selected.',
                },
                {
                    name: 'hasSelectAll',
                    type: 'boolean',
                    description: 'Whether to show a select-all checkbox.',
                },
                {
                    name: 'hasSearch',
                    type: 'boolean',
                    description: 'Shows a search field for filtering options.',
                },
            ]}
            example={{
                title: 'Teams form',
                preview: (
                    <FormPreview>
                        <MultiSelectorExample />
                    </FormPreview>
                ),
                code: `/** Submits selected teams as repeated form entries. */
export default function TeamsForm() {
  return (
    <Form action="/api/example" method="post">
      <MultiSelector
        name="teams"
        label="Teams"
        options={['design', 'engineering', 'support']}
        defaultValue={['design', 'engineering']}
        required
      />
      <Stack direction="horizontal" gap={2}>
        <Button type="submit" label="Submit" variant="primary" />
        <Button type="reset" label="Reset" />
      </Stack>
    </Form>
  );
}`,
            }}
        />
    );
}

/** Shows a themed multiple selector without collapsing repeated submission names. */
export function MultiSelectorExample() {
    // Start with two teams so submission visibly demonstrates repeated entries.
    return (
        <MultiSelector
            name="teams"
            label="Teams"
            options={['design', 'engineering', 'support']}
            defaultValue={['design', 'engineering']}
            required
        />
    );
}
