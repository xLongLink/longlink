import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList
} from '@/components/shadcn/combobox';

/** Documents the installed searchable shadcn composition. */
export default function ComboboxPage() {
    return (
        <ViewLayout
            name="Combobox"
            properties={[
                { name: 'items', type: 'Item[]', description: 'Items searched and rendered by the list.' },
                { name: 'name', type: 'string', description: 'Native form field name for the selected value.' },
                {
                    name: 'defaultValue / value',
                    type: 'Value | Value[] | null',
                    description: 'Uncontrolled initial or controlled selection; arrays require multiple.'
                },
                {
                    name: 'onValueChange',
                    type: '(value, eventDetails) => void',
                    description: 'Native Base UI selection callback, not Selector onChange.'
                },
                {
                    name: 'inputValue / onInputValueChange',
                    type: 'string / (text, eventDetails) => void',
                    description: 'Controls search text independently of the selected value.'
                },
                { name: 'multiple', type: 'boolean', description: 'Enables multiple selection with array values.' },
                {
                    name: 'itemToStringLabel / itemToStringValue',
                    type: '(item) => string',
                    description: 'Converts object items for display and form submission.'
                },
                {
                    name: 'ComboboxInput.showTrigger / showClear',
                    type: 'boolean',
                    description: 'Shows the trigger by default; clear is opt-in.'
                },
                {
                    name: 'ComboboxContent.side / align / sideOffset / alignOffset / anchor',
                    type: 'Base UI positioning props',
                    description: 'Positions the popup, optionally against a chips anchor.'
                },
                {
                    name: 'ComboboxList.children',
                    type: '(item, index) => ReactNode',
                    description: 'Renders matching items as ComboboxItem children.'
                },
                { name: 'ComboboxItem.value', type: 'Value', description: 'Selected item value.' },
                { name: 'ComboboxEmpty', type: 'component', description: 'Content for an empty filtered list.' },
                {
                    name: 'ComboboxGroup / ComboboxLabel / ComboboxCollection / ComboboxSeparator',
                    type: 'components',
                    description: 'Compose grouped item collections.'
                },
                {
                    name: 'ComboboxChips / ComboboxChip / ComboboxChipsInput',
                    type: 'components',
                    description: 'Compose multiple selected values and the editable input; Chip accepts showRemove.'
                },
                {
                    name: 'ComboboxTrigger / ComboboxValue',
                    type: 'components',
                    description: 'Compose a separate trigger and selected-value display.'
                },
                {
                    name: 'useComboboxAnchor',
                    type: '() => RefObject<HTMLDivElement | null>',
                    description: 'Creates a chips container ref for ComboboxContent anchor.'
                }
            ]}
            example={{
                title: 'Searchable status selection',
                preview: (
                    <FormPreview>
                        <ComboboxExample />
                    </FormPreview>
                ),
                code: `<Combobox name="status" items={['open', 'closed']} defaultValue="open">
  <ComboboxInput aria-label="Status" showClear />
  <ComboboxContent>
    <ComboboxEmpty>No matching status</ComboboxEmpty>
    <ComboboxList>
      {item => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
    </ComboboxList>
  </ComboboxContent>
</Combobox>`
            }}
        />
    );
}

/** Shows searchable native selection in a form. */
export function ComboboxExample() {
    return (
        <Combobox name="status" items={['open', 'closed']} defaultValue="open">
            <ComboboxInput aria-label="Status" showClear />
            <ComboboxContent>
                <ComboboxEmpty>No matching status</ComboboxEmpty>
                <ComboboxList>
                    {(item: string) => (
                        <ComboboxItem key={item} value={item}>
                            {item}
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}
