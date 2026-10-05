import { useState } from 'react';
import ViewLayout from './ViewLayout';
import { ComplexSelector } from '@/components/ui/ComplexSelector';
import { RadioList, RadioListItem } from '@/components/ui/RadioList';

/** Documents ComplexSelector in LongLink Views. */
export default function ComplexSelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ComplexSelector"
            examples={[
                {
                    title: 'ComplexSelector',
                    preview: <ComplexSelectorExample />,
                    code: `function Example() {
  const [value, setValue] = useState('team');

  return (
    <ComplexSelector
      label="Plan"
      value={value}
      onChange={setValue}
      triggerLabel={value}
    >
      {(value, onChange, close) => (
        <RadioList
          label="Choose a plan"
          value={value}
          onChange={(next) => {
            onChange(next);
            close();
          }}
        >
          <RadioListItem label="Solo" value="solo" />
          <RadioListItem label="Team" value="team" />
        </RadioList>
      )}
    </ComplexSelector>
  );
}`,
                },
            ]}
        />
    );
}

/** Keeps the selected plan and its trigger label in sync. */
export function ComplexSelectorExample() {
    const [value, setValue] = useState('team');

    // Render a plan picker that commits the choice before closing.
    return (
        <ComplexSelector
            label="Plan"
            value={value}
            triggerLabel={value === 'team' ? 'Team' : 'Solo'}
            onChange={setValue}
            width="100%"
        >
            {(plan, onChange, close) => (
                <RadioList
                    label="Choose a plan"
                    value={plan}
                    onChange={(next) => {
                        // Commit the choice and close the selector.
                        onChange(next);
                        close();
                    }}
                >
                    <RadioListItem label="Solo" value="solo" />
                    <RadioListItem label="Team" value="team" />
                </RadioList>
            )}
        </ComplexSelector>
    );
}
