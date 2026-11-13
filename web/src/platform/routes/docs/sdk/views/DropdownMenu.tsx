import ViewLayout from './ViewLayout';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuItem, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';

/** Documents native menu composition in LongLink Views. */
export default function DropdownMenuPage() {
    return (
        <ViewLayout
            name="DropdownMenu"
            properties={[
                { name: 'children', type: 'ReactNode', description: 'Trigger, content, and menu items.' },
                { name: 'open', type: 'boolean', description: 'Controlled open state.' },
                { name: 'defaultOpen', type: 'boolean', description: 'Initial uncontrolled open state.' },
                {
                    name: 'onOpenChange',
                    type: '(open: boolean, eventDetails: Menu.Root.ChangeEventDetails) => void',
                    description: 'Called when the menu requests an open-state change.'
                }
            ]}
            example={{
                title: 'DropdownMenu',
                preview: <DropdownMenuExample />,
                code: `function Example() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" />}>Actions</DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => navigate('/edit')}>Edit</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}`
            }}
        />
    );
}

/** Demonstrates a composed trigger and menu content. */
export function DropdownMenuExample() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>Actions</DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem>Copy</DropdownMenuItem>
                <DropdownMenuItem>Paste</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
