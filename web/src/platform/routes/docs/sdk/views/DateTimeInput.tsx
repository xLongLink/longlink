import ViewLayout from './ViewLayout';
import { useState, type ComponentProps } from 'react';
import { DateTimeInput } from '@/components/ui/DateTimeInput';

/** Documents DateTimeInput in LongLink Views. */
export default function DateTimeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="DateTimeInput"
            examples={[
                {
                    title: 'DateTimeInput',
                    preview: <DateTimeInputExample />,
                    code: `function Example() {
  const [value, setValue] = useState();

  return (
    <DateTimeInput label="Appointment" value={value} onChange={setValue} />
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps appointment date and time changes local to this example. */
export function DateTimeInputExample() {
    const [value, setValue] = useState<ComponentProps<typeof DateTimeInput>['value']>();

    // Retain the combined date and time selected by the user.
    return <DateTimeInput label="Appointment" value={value} onChange={setValue} size="sm" width="100%" />;
}
