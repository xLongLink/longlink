import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { Selector } from '@/components/ui/Selector';

/** Documents Selector in LongLink Views. */
export default function SelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="Selector"
            examples={[
                {
                    title: 'Selector',
                    preview: <SelectorExample />,
                    code: `function Example() {
  const [value, setValue] = useState('open');

  return (
    <Selector
      label="Status"
      options={['open', 'closed']}
      value={value}
      onChange={setValue}
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps the selected status local to this example. */
export function SelectorExample() {
    const [value, setValue] = useState('open');

    // Retain the selected option when the popup closes.
    return (
        <Selector
            label="Status"
            options={[
                { value: 'open', label: 'Open' },
                { value: 'closed', label: 'Closed' },
            ]}
            size="sm"
            value={value}
            width="100%"
            onChange={setValue}
        />
    );
}
