import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Switch } from '@/components/ui/Switch';

/** Documents Switch in LongLink Views. */
export default function SwitchPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Switch"
            examples={[
                {
                    title: 'Switch',
                    preview: <SwitchExample />,
                    code: `function Example() {
  const [value, setValue] = useState(true);

  return <Switch label="Enabled" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}

/** Keeps the enabled setting local to this example. */
export function SwitchExample() {
    const [value, setValue] = useState(true);

    // Toggle the setting without changing any real preferences.
    return <Switch label="Enabled" size="sm" value={value} onChange={setValue} />;
}
