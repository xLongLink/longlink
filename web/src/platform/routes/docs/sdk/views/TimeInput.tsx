import ViewLayout from './ViewLayout';

/** Documents TimeInput in LongLink Views. */
export default function TimeInputPage() {
    // Render this component's authored examples in the shared documentation layout.
    return (
        <ViewLayout
            name="TimeInput"
            examples={[
                {
                    title: 'TimeInput',
                    code: `function Example() {
  const [value, setValue] = useState();

  return <TimeInput label="Start time" value={value} onChange={setValue} />;
}`,
                },
            ]}
        />
    );
}
