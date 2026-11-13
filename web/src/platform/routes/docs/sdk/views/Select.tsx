import ViewLayout from './ViewLayout';
import FormPreview from './FormPreview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

/** Documents the installed shadcn Select composition without a form adapter. */
export default function SelectPage() {
    return (
        <ViewLayout
            name="Select"
            properties={[
                { name: 'name', type: 'string', description: 'Name of the native form field.' },
                {
                    name: 'defaultValue',
                    type: 'Value | Value[] | null',
                    description: 'Initial uncontrolled selection.',
                },
                {
                    name: 'value',
                    type: 'Value | Value[] | null',
                    description: 'Controlled selection; use an array with multiple.',
                },
                {
                    name: 'onValueChange',
                    type: '(value, eventDetails) => void',
                    description: 'Native Base UI change callback, not Selector onChange.',
                },
                { name: 'multiple', type: 'boolean', description: 'Enables multiple selection.' },
                {
                    name: 'items',
                    type: 'Record<string, ReactNode> | { value, label }[]',
                    description: 'Maps values to trigger labels.',
                },
                { name: 'required', type: 'boolean', description: 'Requires a selection for form submission.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables the control and excludes it from submission.',
                },
                { name: 'SelectTrigger.size', type: "'sm' | 'default'", description: 'Installed trigger density.' },
                {
                    name: 'SelectValue.placeholder',
                    type: 'ReactNode',
                    description: 'Content shown without a selection.',
                },
                {
                    name: 'SelectContent.side / align / sideOffset / alignOffset',
                    type: 'Base UI positioning props',
                    description: 'Positions the popup; alignItemWithTrigger defaults to true.',
                },
                { name: 'SelectItem.value', type: 'Value', description: 'Value submitted when this item is selected.' },
                {
                    name: 'SelectGroup / SelectLabel / SelectSeparator',
                    type: 'components',
                    description: 'Compose labeled option groups and separators.',
                },
                {
                    name: 'SelectScrollUpButton / SelectScrollDownButton',
                    type: 'components',
                    description: 'Scroll controls already included by SelectContent.',
                },
            ]}
            example={{
                title: 'Native status selection',
                preview: (
                    <FormPreview>
                        <SelectExample />
                    </FormPreview>
                ),
                code: `<Select name="status" defaultValue="open">
  <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="open">Open</SelectItem>
    <SelectItem value="closed">Closed</SelectItem>
  </SelectContent>
</Select>`,
            }}
        />
    );
}

/** Shows a named native Select in a form. */
export function SelectExample() {
    return (
        <Select name="status" defaultValue="open">
            <SelectTrigger aria-label="Status">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
        </Select>
    );
}
