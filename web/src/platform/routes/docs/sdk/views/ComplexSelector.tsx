import ViewLayout from './ViewLayout';

/** Documents ComplexSelector in LongLink Views. */
export default function ComplexSelectorPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="ComplexSelector"
            examples={[
                {
                    title: 'ComplexSelector',
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
