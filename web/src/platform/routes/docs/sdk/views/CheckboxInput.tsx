import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { CheckboxInput } from '@/components/ui/CheckboxInput';

/** Documents CheckboxInput in LongLink Views. */
export default function CheckboxInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="CheckboxInput"
            examples={[
                {
                    title: 'CheckboxInput',
                    preview: <CheckboxInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState(false);

  return <CheckboxInput label="Approved" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}

/** Keeps checkbox selection local to this example. */
export function CheckboxInputExample() {
    const [value, setValue] = useState(true);

    // Update the selected state as the checkbox is toggled.
    return <CheckboxInput label="Approved" size="sm" value={value} onChange={setValue} />;
}
