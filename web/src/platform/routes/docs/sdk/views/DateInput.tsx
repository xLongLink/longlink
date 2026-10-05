import ViewLayout from './ViewLayout';
import { DateInput } from '@/components/ui/DateInput';
import { useState, type ComponentProps } from 'react';

/** Documents DateInput in LongLink Views. */
export default function DateInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateInput"
            examples={[
                {
                    title: 'DateInput',
                    preview: <DateInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState('2026-10-02');

  return <DateInput label="Due date" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}

/** Retains edited and cleared dates in this example. */
export function DateInputExample() {
    const [value, setValue] = useState<ComponentProps<typeof DateInput>['value']>('2026-10-02');

    // Commit typed dates and calendar selections to local state.
    return <DateInput label="Due date" value={value} onChange={setValue} size="sm" width="100%" />;
}
