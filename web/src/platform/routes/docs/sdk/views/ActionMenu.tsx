import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { ActionMenu } from '@/components/custom/ActionMenu';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';

/** Documents ActionMenu in LongLink Views. */
export default function ActionMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ActionMenu"
            properties={[
                {
                    name: 'button',
                    type: '{ label: string; variant?: "ghost" | "primary" | "secondary" | "destructive"; size?: "sm" | "lg" | "md"; isDisabled?: boolean; }',
                    description: 'Label, appearance, size, and disabled state of the menu trigger.',
                },
                {
                    name: 'items',
                    type: 'ActionMenuOption[]',
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
                title: 'ActionMenu',
                preview: <ActionMenuExample />,
                code: `function Example() {
  return (
    <ActionMenu
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
export function ActionMenuExample() {
    const [action, setAction] = useState('');

    // Report simulated actions without changing the clipboard.
    return (
        <Stack gap={2}>
            <ActionMenu
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
