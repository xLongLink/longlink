import { X } from 'lucide-react';
import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Text } from '@astryxdesign/core/Text';
import { Stack } from '@astryxdesign/core/Stack';
import { IconButton } from '@/components/ui/IconButton';

/** Documents IconButton in LongLink Views. */
export default function IconButtonPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="IconButton"
            examples={[
                {
                    title: 'IconButton',
                    preview: <IconButtonExample />,
                    code: `function Example() {
  return (
    <IconButton
      label="Refresh"
      icon={<Icon icon="refresh" size="sm" />}
      onClick={async () => {
        await request('/api/refresh', { method: 'POST' });
      }}
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Demonstrates an icon action with local feedback. */
export function IconButtonExample() {
    const [action, setAction] = useState('');

    // Report the close action without dismissing the documentation.
    return (
        <Stack gap={2}>
            <IconButton
                icon={<X aria-hidden="true" size={20} />}
                label="Close"
                size="sm"
                tooltip="Close"
                onClick={() => setAction('Closed')}
            />
            {action && <Text role="status">{action}</Text>}
        </Stack>
    );
}
