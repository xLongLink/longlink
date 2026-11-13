import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';

/** Documents DropdownMenu in LongLink Views. */
export default function DropdownMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DropdownMenu"
            properties={[
                {
                    name: 'button',
                    type: '{ label: string; variant?: "ghost" | "primary" | "secondary" | "destructive"; size?: "sm" | "lg" | "md"; isDisabled?: boolean; }',
                    description:
                        'Props for the trigger button (Button props except onClick). Mutually exclusive with `trigger`.',
                },
                {
                    name: 'items',
                    type: 'DropdownMenuOption[]',
                    description: 'Menu actions, links, dividers, and sections.',
                },
                {
                    name: 'isMenuOpen',
                    type: 'boolean',
                    description: 'Controlled menu open state.',
                },
                {
                    name: 'onOpenChange',
                    type: '(isOpen: boolean) => void',
                    description: 'Callback fired when the open state changes.',
                },
            ]}
            example={{
                title: 'DropdownMenu',
                preview: <DropdownMenuExample />,
                code: `function Example() {
  return (
    <DropdownMenu
      button={{ label: 'Actions' }}
      items={[{ id: 'edit', label: 'Edit', onClick: () => navigate('/edit') }]}
    />
  );
}`,
            }}
        />
    );
}

/** Demonstrates menu actions with feedback confined to the example. */
export function DropdownMenuExample() {
    const [action, setAction] = useState('');

    // Report simulated actions without changing the clipboard.
    return (
        <Stack gap={2}>
            <DropdownMenu
                button={{ label: 'Edit', size: 'sm' }}
                items={[
                    { label: 'Copy', onClick: () => setAction('Copied') },
                    { label: 'Paste', onClick: () => setAction('Pasted') },
                ]}
            />
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}
