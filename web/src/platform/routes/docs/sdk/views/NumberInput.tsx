import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { NumberInput } from '@/components/ui/NumberInput';

/** Documents NumberInput in LongLink Views. */
export default function NumberInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="NumberInput"
            examples={[
                {
                    title: 'NumberInput',
                    preview: <NumberInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState(1);

  return (
    <NumberInput
      label="Quantity"
      value={value}
      onChange={setValue}
      min={1}
      step={1}
    />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps quantity edits local to this example. */
export function NumberInputExample() {
    const [value, setValue] = useState(3);

    // Retain a quantity within the input's minimum constraint.
    return (
        <NumberInput
            isLabelHidden
            label="Quantity"
            min={1}
            size="sm"
            units="qty"
            value={value}
            width="100%"
            onChange={setValue}
        />
    );
}
