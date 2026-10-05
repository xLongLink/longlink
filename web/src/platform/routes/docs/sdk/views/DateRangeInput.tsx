import ViewLayout from './ViewLayout';
import { useState, type ComponentProps } from 'react';
import { DateRangeInput } from '@/components/ui/DateRangeInput';

/** Documents DateRangeInput in LongLink Views. */
export default function DateRangeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateRangeInput"
            examples={[
                {
                    title: 'DateRangeInput',
                    preview: <DateRangeInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState({
    start: '2026-10-02',
    end: '2026-10-09',
  });

  return <DateRangeInput label="Period" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}

/** Keeps date-range selection local to this example. */
export function DateRangeInputExample() {
    const [value, setValue] = useState<ComponentProps<typeof DateRangeInput>['value']>({
        start: '2026-10-02',
        end: '2026-10-09',
    });

    // Retain range changes, including clearing the selection.
    return <DateRangeInput label="Period" value={value} onChange={setValue} size="sm" width="100%" />;
}
