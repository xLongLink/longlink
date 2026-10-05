import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { MultiSelector } from '@/components/ui/MultiSelector';

/** Documents MultiSelector in LongLink Views. */
export default function MultiSelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="MultiSelector"
            examples={[
                {
                    title: 'MultiSelector',
                    preview: <MultiSelectorExample />,
                    code: `function Example() {
  const [value, setValue] = useState(['design']);

  return (
    <MultiSelector
      label="Teams"
      options={['design', 'engineering']}
      value={value}
      onChange={setValue}
      hasSearch
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps multiple team selections local to this example. */
export function MultiSelectorExample() {
    const [value, setValue] = useState(['design']);

    // Allow teams to be selected and removed independently.
    return (
        <MultiSelector
            label="Teams"
            options={[
                { value: 'design', label: 'Design' },
                { value: 'engineering', label: 'Engineering' },
            ]}
            value={value}
            onChange={setValue}
            size="sm"
            width="100%"
        />
    );
}
