import ViewLayout from './ViewLayout';
import { TimeInput } from '@/components/ui/TimeInput';
import { useState, type ComponentProps } from 'react';

/** Documents TimeInput in LongLink Views. */
export default function TimeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TimeInput"
            examples={[
                {
                    title: 'TimeInput',
                    preview: <TimeInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState();

  return <TimeInput label="Start time" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}

/** Keeps the selected time local to this example. */
export function TimeInputExample() {
    const [value, setValue] = useState<ComponentProps<typeof TimeInput>['value']>();

    // Retain edited times without sending a request.
    return (
        <TimeInput
            label="Start time"
            value={value}
            placeholder="Select a time"
            onChange={setValue}
            size="sm"
            width="100%"
        />
    );
}
