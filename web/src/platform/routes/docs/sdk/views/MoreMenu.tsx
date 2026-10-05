import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Ellipsis } from 'lucide-react';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { MoreMenu } from '@/components/ui/MoreMenu';

/** Documents MoreMenu in LongLink Views. */
export default function MoreMenuPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MoreMenu"
            examples={[
                {
                    title: 'MoreMenu',
                    preview: <MoreMenuExample />,
                    code: `function Example() {
  return (
    <MoreMenu
      items={[{ id: 'edit', label: 'Edit', onClick: () => navigate('/edit') }]}
    />
  );
}`,
                },
            ]}
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
                icon={<Ellipsis aria-hidden="true" size={20} />}
                items={[
                    { label: 'Edit', onClick: () => setAction('Editing order') },
                    { label: 'Delete', variant: 'destructive', onClick: () => setAction('Deleted') },
                ]}
            />
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}
