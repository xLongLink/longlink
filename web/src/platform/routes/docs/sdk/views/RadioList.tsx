import ViewLayout from './ViewLayout';

/** Documents RadioList in LongLink Views. */
export default function RadioListPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="RadioList"
            examples={[
                {
                    title: 'RadioList',
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
