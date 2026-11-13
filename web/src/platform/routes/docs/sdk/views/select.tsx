import ViewLayout from './view-layout';
import FormPreview from './form-preview';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/shadcn/select';

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
                    description: 'Initial uncontrolled selection.'
                },
                {
                    name: 'value',
                    type: 'Value | Value[] | null',
                    description: 'Controlled selection; use an array with multiple.'
                },
                {
                    name: 'onValueChange',
                    type: '(value, eventDetails) => void',
                    description: 'Called with the selected value and Base UI event details.'
                },
                {
                    name: 'multiple',
                    type: 'boolean',
                    description:
                        'Enables array-valued selection. Named groups submit one form entry per selected value.'
                },
                {
                    name: 'items',
                    type: 'Record<string, ReactNode> | { value, label }[]',
                    description: 'Maps values to trigger labels.'
                },
                { name: 'required', type: 'boolean', description: 'Requires a selection for form submission.' },
                {
                    name: 'disabled',
                    type: 'boolean',
                    description: 'Disables the control and excludes it from submission.'
                },
                { name: 'SelectTrigger.size', type: "'sm' | 'default'", description: 'Installed trigger density.' },
                {
                    name: 'SelectValue.placeholder',
                    type: 'ReactNode',
                    description: 'Content shown without a selection.'
                },
                {
                    name: 'SelectContent.side / align / sideOffset / alignOffset',
                    type: 'Base UI positioning props',
                    description: 'Positions the popup; alignItemWithTrigger defaults to true.'
                },
                { name: 'SelectItem.value', type: 'Value', description: 'Value submitted when this item is selected.' },
                {
                    name: 'SelectGroup / SelectLabel / SelectSeparator',
                    type: 'components',
                    description: 'Compose labeled option groups and separators.'
                },
                {
                    name: 'SelectScrollUpButton / SelectScrollDownButton',
                    type: 'components',
                    description: 'Scroll controls already included by SelectContent.'
                }
            ]}
            example={{
                title: 'Single and multiple selection',
                preview: (
                    <FormPreview>
                        <div className="flex flex-col gap-4">
                            <SelectExample />
                            <MultipleSelectExample />
                        </div>
                    </FormPreview>
                ),
                code: `<Select name="status" defaultValue="open">
  <SelectTrigger aria-label="Status"><SelectValue /></SelectTrigger>
  <SelectContent>
    <SelectItem value="open">Open</SelectItem>
    <SelectItem value="closed">Closed</SelectItem>
  </SelectContent>
</Select>
<Select name="teams" multiple defaultValue={['design', 'engineering']} required>
  <SelectTrigger className="w-full" aria-label="Teams"><SelectValue placeholder="Select teams" /></SelectTrigger>
  <SelectContent>
    <SelectItem value="design">Design</SelectItem>
    <SelectItem value="engineering">Engineering</SelectItem>
    <SelectItem value="support">Support</SelectItem>
  </SelectContent>
</Select>`
            }}
        />
    );
}

/** Shows array-valued selection using the installed shadcn Select parts. */
function MultipleSelectExample() {
    // Native Select owns selection and repeated form entries.
    return (
        <Select name="teams" multiple defaultValue={['design', 'engineering']} required>
            <SelectTrigger className="w-full" aria-label="Teams">
                <SelectValue placeholder="Select teams" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="design">Design</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="support">Support</SelectItem>
            </SelectContent>
        </Select>
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
