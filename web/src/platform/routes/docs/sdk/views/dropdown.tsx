import ViewLayout from './view-layout';
import { Button, Dropdown, DropdownItem, DropdownContent, DropdownTrigger } from '@/components/longlink';

/** Documents native menu composition in LongLink Views. */
export default function DropdownPage() {
    return (
        <ViewLayout
            name="Dropdown"
            properties={[
                { name: 'children', type: 'ReactNode' },
                { name: 'open', type: 'boolean' },
                { name: 'defaultOpen', type: 'boolean' },
                { name: 'onOpenChange', type: '(open: boolean, eventDetails: Menu.Root.ChangeEventDetails) => void' }
            ]}
            example={{
                title: 'Dropdown',
                preview: <DropdownExample />,
                code: `function Example() {
  return (
    <Dropdown>
      <DropdownTrigger render={<Button variant="outline" />}>Actions</DropdownTrigger>
      <DropdownContent>
        <DropdownItem onClick={() => navigate('/edit')}>Edit</DropdownItem>
      </DropdownContent>
    </Dropdown>
  );
}`
            }}
        />
    );
}

/** Demonstrates a composed trigger and menu content. */
export function DropdownExample() {
    return (
        <Dropdown>
            <DropdownTrigger render={<Button variant="outline" size="sm" />}>Actions</DropdownTrigger>
            <DropdownContent>
                <DropdownItem>Copy</DropdownItem>
                <DropdownItem>Paste</DropdownItem>
            </DropdownContent>
        </Dropdown>
    );
}
