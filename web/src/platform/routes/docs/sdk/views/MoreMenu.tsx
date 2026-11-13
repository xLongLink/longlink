import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { MoreMenu } from '@/components/ui/MoreMenu';
import { NativeText as Text } from '@/components/ui/NativeText';
import { NativeStack as Stack } from '@/components/ui/NativeStack';

/** Documents MoreMenu in LongLink Views. */
export default function MoreMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MoreMenu"
            properties={[
                {
                    name: 'items',
                    type: 'ActionMenuOption[]',
                    description:
                        'Menu items: data array of actions, dividers, and sections. Same type as ActionMenu items.',
                },
                {
                    name: 'label',
                    type: 'string',
                    description: 'Accessible label for the trigger button (aria-label) and tooltip text.',
                },
                {
                    name: 'icon',
                    type: 'StoneIconName',
                    description: 'Override the default three-dot icon. Accepts any ReactNode.',
                },
                {
                    name: 'isDisabled',
                    type: 'boolean',
                    description: 'Whether the menu trigger is disabled.',
                },
                {
                    name: 'onOpenChange',
                    type: '(isOpen: boolean) => void',
                    description: 'Callback fired when the menu opens or closes.',
                },
            ]}
            example={{
                title: 'MoreMenu',
                preview: <MoreMenuExample />,
                code: `function Example() {
  return (
    <MoreMenu
      items={[{ id: 'edit', label: 'Edit', onClick: () => navigate('/edit') }]}
    />
  );
}`,
            }}
        />
    );
}

/** Demonstrates overflow actions without changing real orders. */
export function MoreMenuExample() {
    const [action, setAction] = useState('');

    // Keep edit and delete feedback within this example.
    return (
        <Stack gap={2}>
            <MoreMenu
                icon="moreHorizontal"
                items={[
                    { label: 'Edit', onClick: () => setAction('Editing order') },
                    { label: 'Delete', variant: 'destructive', onClick: () => setAction('Deleted') },
                ]}
            />
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}
