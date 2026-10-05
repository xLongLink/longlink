import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { RadioList, RadioListItem } from '@/components/ui/RadioList';

/** Documents RadioList in LongLink Views. */
export default function RadioListPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="RadioList"
            examples={[
                {
                    title: 'RadioList',
                    preview: <RadioListExample />,
                    code: `function Example() {
  const [value, setValue] = useState('team');

  return (
    <RadioList label="Plan" value={value} onChange={setValue}>
      <RadioListItem label="Solo" value="solo" />
      <RadioListItem label="Team" value="team" />
    </RadioList>
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps the chosen plan local to this example. */
export function RadioListExample() {
    const [value, setValue] = useState('team');

    // Allow exactly one plan to remain selected.
    return (
        <RadioList label="Plan" orientation="horizontal" size="sm" value={value} onChange={setValue} isLabelHidden>
            <RadioListItem label="Solo" value="solo" />
            <RadioListItem label="Team" value="team" />
        </RadioList>
    );
}
